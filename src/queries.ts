export type Query = 'connect' | 'disconnect';

export const connectQuerySchema = ({
  fromAddr,
  toAddr,
  alias,
  namespace,
  signature,
}: {
  fromAddr: string;
  toAddr: string;
  alias: string;
  namespace: string;
  signature: string;
}) => {
  return {
    operationName: 'follow',
    query: `mutation follow {\n  follow(fromAddr: \"${fromAddr}\", toAddr: \"${toAddr}\", alias: \"${alias}\", namespace: \"${namespace}\", signature: \"${signature}\") {\n    result\n  }\n}\n`,
    variables: {},
  };
};

export const disconnectQuerySchema = ({
  fromAddr,
  toAddr,
  namespace,
  signature,
}: {
  fromAddr: string;
  toAddr: string;
  namespace: string;
  signature: String;
}) => {
  return {
    operationName: 'unfollow',
    query: `mutation unfollow {\n  unfollow(fromAddr: \"${fromAddr}\", toAddr: \"${toAddr}\", namespace: \"${namespace}\", signature: \"${signature}\") {\n    result\n  }\n}\n`,
    variables: {},
  };
};

export const authSchema = ({
  address,
  signature,
}: {
  address: string;
  signature: string;
}) => {
  return {
    operationName: 'auth',
    query: `mutation auth($address: String!, $signature: String!) {
      auth(address: $address, signature: $signature) {
        result
        authToken
      }
    }`,
    variables: { address, signature },
  };
};

export const setAliasQuerySchema = ({
  fromAddr,
  toAddr,
  namespace,
  signature,
  alias,
}: {
  fromAddr: string;
  toAddr: string;
  namespace: string;
  signature: string;
  alias: string;
}) => {
  return {
    operationName: 'setAlias',
    query: `mutation setAlias {\n  setAlias(fromAddr: \"${fromAddr}\", toAddr: \"${toAddr}\", alias: \"${alias}\", namespace: \"${namespace}\", signature: \"${signature}\") {\n    result\n  }\n}\n`,
    variables: {},
  };
};

export const allFollowingsSchema = ({
  address,
  namespace,
}: {
  address: string;
  namespace?: string;
}) => {
  return {
    operationName: 'allFollowings',
    query: `query allFollowings($address: String!, $namespace: String) {
      allFollowings(address: $address, namespace: $namespace) {
        address
        ens
        alias
        namespace
        lastModifiedTime
      }
    }`,
    variables: { address, namespace },
  };
};

export const querySchemas = {
  connect: connectQuerySchema,
  disconnect: disconnectQuerySchema,
  auth: authSchema,
  setAlias: setAliasQuerySchema,
  allFollowings: allFollowingsSchema,
};

export const request = async (url = '', data = {}) => {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
    },
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(data),
  });

  return response.json();
};

export const handleQuery = (
  data: {
    query: string;
    variables: object;
    operationName: string;
  },
  url: string,
) => {
  return request(url, data);
};

export const auth = ({
  address,
  signature,
  url,
}: {
  address: string;
  signature: string;
  url: string;
}) => {
  const result = querySchemas['auth']({
    address,
    signature,
  });
  return handleQuery(result, url);
};

export const follow = ({
  fromAddr,
  toAddr,
  alias,
  namespace,
  url,
  signature,
}: {
  fromAddr: string;
  toAddr: string;
  alias: string;
  namespace: string;
  signature: string;
  url: string;
}) => {
  const schema = querySchemas['connect']({
    fromAddr,
    toAddr,
    alias,
    namespace,
    signature,
  });
  return handleQuery(schema, url);
};

export const unfollow = ({
  fromAddr,
  toAddr,
  namespace,
  url,
  signature,
}: {
  fromAddr: string;
  toAddr: string;
  namespace: string;
  signature: string;
  url: string;
}) => {
  const schema = querySchemas['disconnect']({
    fromAddr,
    toAddr,
    namespace,
    signature,
  });
  return handleQuery(schema, url);
};

export const setAlias = ({
  fromAddr,
  toAddr,
  alias,
  namespace,
  url,
  signature,
}: {
  fromAddr: string;
  toAddr: string;
  alias: string;
  namespace: string;
  signature: string;
  url: string;
}) => {
  const schema = querySchemas['setAlias']({
    fromAddr,
    toAddr,
    alias,
    namespace,
    signature,
  });
  return handleQuery(schema, url);
};

export const allFollowings = ({
  address,
  namespace,
  url,
}: {
  address: string;
  namespace: string;
  url: string;
}) => {
  const schema = querySchemas['allFollowings']({
    address,
    namespace,
  });
  return handleQuery(schema, url);
};
