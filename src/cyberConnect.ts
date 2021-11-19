import { CeramicClient } from '@ceramicnetwork/http-client';
import KeyDidResolver from 'key-did-resolver';
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import ThreeIdProvider from '3id-did-provider';
import { EthereumAuthProvider } from '@3id/connect';
import { hash } from '@stablelib/sha256';
import { fromString } from 'uint8arrays';
import { DID } from 'dids';
import { IDX } from '@ceramicstudio/idx';
import { endpoints, Env, Endpoint } from './network';
import { follow, unfollow } from './queries';

interface Connection {
  connectionType: string;
  target: string;
  namespace: string;
  createdAt: string;
  alias: string;
}

type Connections = Connection[];

interface CyberConnetStore {
  outboundLink: Connections;
}

class CyberConnect {
  address: string = '';
  namespace: string;
  endpoint: Endpoint;
  ceramicClient: CeramicClient;
  authProvider: EthereumAuthProvider | undefined;
  resolverRegistry: any;
  idxInstance: IDX | undefined;
  signature: string = '';

  // ethProvider is an Ethereum provider and addresses an array of strings
  constructor(config: {
    ethProvider: any;
    namespace: string;
    env: keyof typeof Env;
  }) {
    const { ethProvider, namespace, env } = config;

    if (!namespace) {
      throw 'Namespace can not be empty';
    }

    this.namespace = namespace;
    this.endpoint = endpoints[env] || endpoints.PRODUCTION;
    this.ceramicClient = new CeramicClient(this.endpoint.ceramicUrl);

    const keyDidResolver = KeyDidResolver.getResolver();
    const threeIdResolver = ThreeIdResolver.getResolver(this.ceramicClient);

    this.resolverRegistry = {
      ...threeIdResolver,
      ...keyDidResolver,
    };

    if (!ethProvider) return;

    ethProvider.enable().then((addresses: string[]) => {
      if (addresses[0]) {
        this.address = addresses[0];
        this.authProvider = new EthereumAuthProvider(ethProvider, this.address);
      }
    });
  }

  async authenticate() {
    if (this.idxInstance) {
      return;
    }

    if (!this.authProvider) {
      console.error('Could not find authProvider');
      return;
    }

    const rst = await this.authProvider.authenticate(
      'Allow this account to control your identity'
    );
    this.signature = rst;
  }

  private async setupIdx() {
    if (this.idxInstance) {
      return;
    }

    if (!this.authProvider) {
      console.error('Could not find authProvider');
      return;
    }

    if (!this.ceramicClient) return;

    const getPermission = async (request: any) => {
      return request.payload.paths;
    };

    const authSecret = hash(fromString(this.signature.slice(2)));
    const authId = (await this.authProvider.accountId()).toString();

    const threeId = await ThreeIdProvider.create({
      getPermission,
      authSecret,
      authId,
      ceramic: this.ceramicClient,
    });

    const threeIdProvider = threeId.getDidProvider();
    const did = new DID({
      provider: threeIdProvider,
      resolver: this.resolverRegistry,
    });

    await did.authenticate();
    await this.ceramicClient.setDID(did);

    this.idxInstance = new IDX({
      ceramic: this.ceramicClient,
      aliases: {
        cyberConnect: this.endpoint.cyberConnectSchema,
      },
    });
  }

  async getOutboundLink() {
    if (!this.idxInstance) {
      console.error('Could not find idx instance');
      return null;
    }

    const result = (await this.idxInstance.get(
      'cyberConnect'
    )) as CyberConnetStore;

    return result?.outboundLink || null;
  }

  private async ceramicConnect(targetAddr: string, alias: string = '') {
    await this.setupIdx();

    const outboundLink = await this.getOutboundLink();

    if (!outboundLink) {
      console.log('Can not get ceramic outboundLink');
      return;
    }

    if (!this.idxInstance) {
      console.error('Could not find idx instance');
      return;
    }

    const link = outboundLink.find((link) => {
      return link.target === targetAddr && link.namespace === this.namespace;
    });

    if (!link) {
      const curTimeStr = String(Date.now());
      outboundLink.push({
        target: targetAddr,
        connectionType: 'follow',
        namespace: this.namespace,
        alias,
        createdAt: curTimeStr,
      });
      this.idxInstance.set('cyberConnect', { outboundLink });
    } else {
      console.warn('You have already connected to the target address');
    }
  }

  private async ceramicDisconnect(targetAddr: string) {
    await this.setupIdx();

    const outboundLink = await this.getOutboundLink();

    if (!outboundLink) {
      console.log('Can not get ceramic outboundLink');
      return;
    }

    if (!this.idxInstance) {
      console.error('Could not find idx instance');
      return;
    }

    const newOutboundLink = outboundLink.filter((link) => {
      return link.target !== targetAddr || link.namespace !== this.namespace;
    });

    this.idxInstance.set('cyberConnect', {
      outboundLink: newOutboundLink,
    });
  }

  async connect(targetAddr: string, alias: string = '') {
    await this.authenticate();

    const resp = await follow({
      fromAddr: this.address,
      toAddr: targetAddr,
      alias,
      namespace: this.namespace,
      url: this.endpoint.cyberConnectApi,
      signature: this.signature,
    });

    if (resp?.data?.follow.result !== 'SUCCESS') {
      console.error('follow error: ', resp?.data?.follow.result);
      return;
    }

    console.log('Connect success');

    this.ceramicConnect(targetAddr, alias);
  }

  async disconnect(targetAddr: string) {
    await this.authenticate();

    const resp = await unfollow({
      fromAddr: this.address,
      toAddr: targetAddr,
      url: this.endpoint.cyberConnectApi,
      namespace: this.namespace,
      signature: this.signature,
    });

    if (resp?.data?.unfollow.result !== 'SUCCESS') {
      console.error('unfollow error: ', resp?.data?.unfollow.result);
      return;
    }

    console.log('Disconnect success');

    this.ceramicDisconnect(targetAddr);
  }
}

export default CyberConnect;