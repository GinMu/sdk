// andrew's work
import {randomAsHex} from '@polkadot/util-crypto';
import {DockAPI} from '../src/api';
import {createNewDockDID, createKeyDetail} from '../src/utils/did';
import {getPublicKeyFromKeyringPair} from '../src/utils/misc';
import {multiResolver, universalResolver, dockResolver} from '../src/resolver';
import ethr from 'ethr-did-resolver';
import {parse as parse_did} from 'did-resolver';

const fullNodeWsRPCEndpoint = 'ws://127.0.0.1:9944';
const universalResolverUrl = 'http://localhost:8080';
const ethereumProviderConfig = {
  networks: [
    {
      name: 'mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/05f321c3606e44599c54dbc92510e6a9',
    },
  ]
};

/**
 * Generate and register a new Dock DID return the DID
 * @param {dock} DockAPI - An initialized connection to a dock full-node.
 * @returns {Promise<string>}
 */
async function createDockDID(dock) {
  const account = dock.keyring.addFromUri('//Alice', {name: 'Alice'});
  dock.setAccount(account);

  const dockDID = createNewDockDID();
  const pair = dock.keyring.addFromUri(randomAsHex(32), null, 'sr25519');
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const keyDetail = createKeyDetail(publicKey, dockDID);
  const transaction = dock.did.new(dockDID, keyDetail);
  await dock.sendTransaction(transaction);

  return dockDID;
}

// connect to a dock node
async function connect(address) {
  const dock = new DockAPI();
  await dock.init({
    address
  });
  return dock;
}

async function main() {
  const dock = await connect(fullNodeWsRPCEndpoint);
  const ethres = ethr.getResolver(ethereumProviderConfig).ethr;
  const providers = {
    'dock': dockResolver(dock),
    'ethr': did => ethres(did, parse_did(did)),
  };
  const resolve = multiResolver(providers, universalResolver(universalResolverUrl));

  const didsToTest = [
    'did:ethr:0xabcabc03e98e0dc2b855be647c39abe984193675',
    'did:work:2UUHQCd4psvkPLZGnWY33L',
    'did:sov:WRfXPg8dantKVubE3HX8pw',
    'did:web:uport.me',
    'did:ethr:0x3b0BC51Ab9De1e5B7B6E34E5b960285805C41736',
    'did:nacl:Md8JiMIwsapml_FtQ2ngnGftNP5UmVCAUuhnLyAsPxI',
    'did:jolo:e76fb4b4900e43891f613066b9afca366c6d22f7d87fc9f78a91515be24dfb21',
    'did:stack:v0:16EMaNw3pkn3v6f2BgnSSs53zAKH4Q8YJg-0',
    'did:hcr:0f674e7e-4b49-4898-85f6-96176c1e30de',
    'did:neoid:priv:b4eeeb80d20bfb38b23001d0659ce0c1d96be0aa',
    'did:elem:EiAS3mqC4OLMKOwcz3ItIL7XfWduPT7q3Fa4vHgiCfSG2A',
    'did:github:gjgd',
    'did:ccp:ceNobbK6Me9F5zwyE3MKY88QZLw',
    'did:work:2UUHQCd4psvkPLZGnWY33L',
    'did:ont:AN5g6gz9EoQ3sCNu7514GEghZurrktCMiH',
    'did:kilt:5GFs8gCumJcZDDWof5ETFqDFEsNwCsVJUj2bX7y4xBLxN5qT',
    'did:evan:testcore:0x126E901F6F408f5E260d95c62E7c73D9B60fd734',
    await createDockDID(dock),
  ];

  await Promise.all(
    didsToTest.map(async did => {
      console.log('resolving did', did)
      console.log({[did]: await resolve(did)});
    })
  );
}

main().then(
  _ => process.exit(0),
  e => {
    console.error(e);
    process.exit(1);
  },
);



// // old
// import {randomAsHex} from '@polkadot/util-crypto';
// import { Resolver as DIFResolver} from 'did-resolver';
//
// // Import Dock API
// import dock from '../src/api';
// import {createNewDockDID, createKeyDetail} from '../src/utils/did';
// import {getPublicKeyFromKeyringPair} from '../src/utils/misc';
// import {getResolver as dockResolver} from '../src/dock-did-resolver';
// import Resolver from '../src/resolver';
//
// // The following can be tweaked depending on where the node is running and what
// // account is to be used for sending the transaction.
// const fullNodeWsRPCEndpoint = 'ws://127.0.0.1:9944';
// const accountUri = '//Alice';
// const accountMetadata = {name: 'Alice'};
//
// // Infura's Ethereum provider for the main net
// const ethereumProviderConfig = {
//   networks: [
//     { name: 'mainnet', rpcUrl: 'https://mainnet.infura.io/v3/05f321c3606e44599c54dbc92510e6a9' },
//   ]
// };
//
// const universalResolverUrl = 'http://localhost:8080';
//
// // Create a new Dock DID
// const dockDID = createNewDockDID();
// // This DID was randomly picked from the publicly available examples out there
// const ethrDid = 'did:ethr:0xabcabc03e98e0dc2b855be647c39abe984193675';
// // This DID was randomly picked from the publicly available example at universal resolver repo
// const workdayDID = 'did:work:2UUHQCd4psvkPLZGnWY33L';
//
// /**
//  * Register a new Dock DID and then resolve using the Dock DID resolver
//  * @returns {Promise<void>}
//  */
// async function resolveDockDID() {
//   const pair = dock.keyring.addFromUri(randomAsHex(32), null, 'sr25519');
//   const publicKey = getPublicKeyFromKeyringPair(pair);
//   const keyDetail = createKeyDetail(publicKey, dockDID);
//   const transaction = dock.did.new(dockDID, keyDetail);
//   await dock.sendTransaction(transaction);
//
//   console.log('DID registered', dockDID);
//
//   const resolver = new DIFResolver(dockResolver(fullNodeWsRPCEndpoint));
//   const result = await resolver.resolve(dockDID);
//   console.log('DID Document from resolver:', JSON.stringify(result, true, 2));
// }
//
// /**
//  * Resolve several DID methods using a single resolver
//  * @returns {Promise<void>}
//  */
// async function resolveSeveralDIDMethodsUsingResolver() {
//   // Register providers for Dock and Ethereum.
//   const providers = {
//     'dock': fullNodeWsRPCEndpoint,
//     'ethr': ethereumProviderConfig,
//   };
//
//   const resolver = new Resolver(providers, universalResolverUrl);
//   resolver.init();
//
//   console.log('Resolving ethereum DID', ethrDid);
//   console.log(await resolver.resolve(ethrDid));
//
//   console.log('Resolving Dock DID', dockDID);
//   console.log(await resolver.resolve(dockDID));
//
//   // There is no provider registered for Workday. Universal resolver will be queried
//   console.log('Resolving Workday DID', workdayDID);
//   console.log(await resolver.resolve(workdayDID));
// }
//
// dock.init({
//   address: fullNodeWsRPCEndpoint
// })
//   .then(() => {
//     const account = dock.keyring.addFromUri(accountUri, accountMetadata);
//     dock.setAccount(account);
//     return resolveDockDID();
//   })
//   .then(resolveSeveralDIDMethodsUsingResolver)
//   .then(async () => {
//     console.log('Example ran successfully');
//     process.exit(0);
//   })
//   .catch(error => {
//     console.error('Error occurred somewhere, it was caught!', error);
//   });
