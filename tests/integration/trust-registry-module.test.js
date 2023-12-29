import { randomAsHex } from "@polkadot/util-crypto";
import { BTreeSet, BTreeMap } from "@polkadot/types";
import { u8aToHex, stringToU8a } from '@polkadot/util';

import { DockAPI } from "../../src/index";

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
  DisableTrustRegistryTests,
} from "../test-constants";

import { createNewDockDID, DidKeypair, typedHexDID } from "../../src/utils/did";
import { registerNewDIDUsingPair } from "./helpers";

const buildTest = DisableTrustRegistryTests ? describe.skip : describe;

buildTest("Trust Registry", () => {
  const dock = new DockAPI();

  // Create a random status list id
  const trustRegistryId = randomAsHex(32);

  // Create a new owner DID, the DID will be registered on the network and own the status list
  const convenerDID = createNewDockDID();
  const ownerSeed = randomAsHex(32);
  let convenerPair;

  const issuerDID = createNewDockDID();
  const issuerSeed = randomAsHex(32);
  let issuerPair;

  const issuerDID2 = createNewDockDID();
  const issuerSeed2 = randomAsHex(32);
  let issuerPair2;

  const verifierDID = createNewDockDID();
  const verifierSeed = randomAsHex(32);
  let verifierPair;

  const verifierDID2 = createNewDockDID();
  const verifierSeed2 = randomAsHex(32);
  let verifierPair2;

  // Create revoke IDs
  const revokeId = (Math.random() * 10e3) | 0;
  const revokeIds = new Set();
  revokeIds.add(revokeId);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    convenerPair = new DidKeypair(
      dock.keyring.addFromUri(ownerSeed, null, "ed25519"),
      1
    );

    issuerPair = new DidKeypair(
      dock.keyring.addFromUri(issuerSeed, null, "ed25519"),
      1
    );

    issuerPair2 = new DidKeypair(
      dock.keyring.addFromUri(issuerSeed2, null, "ed25519"),
      1
    );

    verifierPair = new DidKeypair(
      dock.keyring.addFromUri(verifierSeed, null, "ed25519"),
      1
    );

    verifierPair2 = new DidKeypair(
      dock.keyring.addFromUri(verifierSeed2, null, "ed25519"),
      1
    );

    // The keyring should be initialized before any test begins as this suite is testing trustRegistry
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    // Register convener
    await registerNewDIDUsingPair(dock, convenerDID, convenerPair);
    // Register issuer DID
    await registerNewDIDUsingPair(dock, issuerDID, issuerPair);
    await registerNewDIDUsingPair(dock, issuerDID2, issuerPair2);
    await registerNewDIDUsingPair(dock, verifierDID, verifierPair);
    await registerNewDIDUsingPair(dock, verifierDID2, verifierPair2);
  }, 40000);

  it("Initializes Trust Registry", async () => {
    expect(
      (await dock.api.query.trustRegistry.trustRegistriesInfo(trustRegistryId))
        .isNone
    ).toEqual(true);

    await dock.trustRegistry.init(
      convenerDID,
      trustRegistryId,
      "Test Registry",
      "Gov framework",
      convenerPair,
      dock
    );

    const registryInfo = (
      await dock.api.query.trustRegistry.trustRegistriesInfo(trustRegistryId)
    ).toJSON();
    expect(registryInfo).toEqual({
      convener: typedHexDID(convenerDID),
      name: "Test Registry",
      govFramework: u8aToHex(stringToU8a("Gov framework"))
    });
  });

  it("Adds schemas to the existing Trust Registry", async () => {
    // Create a random status list id
    const schemaId = randomAsHex(32);

    await dock.trustRegistry.init(
      convenerDID,
      trustRegistryId,
      "Test Registry",
      "Gov framework",
      convenerPair,
      dock
    );

    const verifiers = new BTreeSet();
    verifiers.add(typedHexDID(issuerDID));
    verifiers.add(typedHexDID(issuerDID2));

    const issuers = new BTreeMap();
    const issuerPrices = new BTreeMap();
    issuerPrices.set("A", 20);
    const issuer2Prices = new BTreeMap();
    issuer2Prices.set("A", 20);

    issuers.set(typedHexDID(issuerDID), issuerPrices);
    issuers.set(typedHexDID(issuerDID2), issuer2Prices);

    const schemas = new BTreeMap();
    schemas.set(schemaId, {
      issuers,
      verifiers,
    });

    await dock.trustRegistry.addSchemaMetadata(
      convenerDID,
      trustRegistryId,
      schemas,
      convenerPair,
      dock
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: Object.fromEntries(
        [...issuers.entries()].map(([issuer, prices]) => [
          JSON.stringify({ did: issuer.asDid }),
          Object.fromEntries([...prices.entries()]),
        ])
      ),
      verifiers: [...verifiers.values()]
        .map((verifier) => ({ did: verifier.asDid }))
        .sort((a, b) => a.did.localeCompare(b.did)),
    });
  });

  it("Suspends issuers in the existing Trust Registry", async () => {
    // Create a random status list id
    const schemaId = randomAsHex(32);

    await dock.trustRegistry.init(
      convenerDID,
      trustRegistryId,
      "Test Registry",
      "Gov framework",
      convenerPair,
      dock
    );

    const verifiers = new BTreeSet();
    verifiers.add(typedHexDID(issuerDID));
    verifiers.add(typedHexDID(issuerDID2));

    const issuers = new BTreeMap();
    const issuerPrices = new BTreeMap();
    issuerPrices.set("A", 20);
    const issuer2Prices = new BTreeMap();
    issuer2Prices.set("A", 20);

    issuers.set(typedHexDID(issuerDID), issuerPrices);
    issuers.set(typedHexDID(issuerDID2), issuer2Prices);

    const schemas = new BTreeMap();
    schemas.set(schemaId, {
      issuers,
      verifiers,
    });

    await dock.trustRegistry.addSchemaMetadata(
      convenerDID,
      trustRegistryId,
      schemas,
      convenerPair,
      dock
    );

    await dock.trustRegistry.suspendIssuers(
      convenerDID,
      trustRegistryId,
      [issuerDID, issuerDID2],
      convenerPair,
      dock
    );

    for (const issuer of [issuerDID, issuerDID2]) {
      expect((await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(trustRegistryId, typedHexDID(issuer))).toJSON()).toEqual({
        suspended: true,
        delegated: []
      });
    }

    await dock.trustRegistry.unsuspendIssuers(
      convenerDID,
      trustRegistryId,
      [issuerDID],
      convenerPair,
      dock
    );

    for (const issuer of [issuerDID]) {
      expect((await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(trustRegistryId, typedHexDID(issuer))).toJSON()).toEqual({
        suspended: false,
        delegated: []
      });
    }

    for (const issuer of [issuerDID2]) {
      expect((await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(trustRegistryId, typedHexDID(issuer))).toJSON()).toEqual({
        suspended: true,
        delegated: []
      });
    }
  });

  it("Updates delegated issuers in the existing Trust Registry", async () => {
    // Create a random status list id
    await dock.trustRegistry.init(
      convenerDID,
      trustRegistryId,
      "Test Registry",
      "Gov framework",
      convenerPair,
      dock
    );

    expect((await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(trustRegistryId, typedHexDID(issuerDID))).toJSON()).toEqual({
      suspended: false,
      delegated: []
    });

    const issuers = new BTreeSet();
    issuers.add(typedHexDID(issuerDID2));

    await dock.trustRegistry.updateDelegatedIssuers(
      issuerDID,
      trustRegistryId,
      { Set: issuers },
      issuerPair,
      dock
    );

    expect((await dock.api.query.trustRegistry.trustRegistryIssuerConfigurations(trustRegistryId, typedHexDID(issuerDID))).toJSON()).toEqual({
      suspended: false,
      delegated: [typedHexDID(issuerDID2)]
    });
  });

  it("Updates schemas to the existing Trust Registry", async () => {
    // Create a random status list id
    const schemaId = randomAsHex(32);

    await dock.trustRegistry.init(
      convenerDID,
      trustRegistryId,
      "Test Registry",
      "Gov framework",
      convenerPair,
      dock
    );

    let verifiers = new BTreeSet();
    verifiers.add(typedHexDID(issuerDID));
    verifiers.add(typedHexDID(issuerDID2));

    let issuers = new BTreeMap();
    let issuerPrices = new BTreeMap();
    issuerPrices.set("A", 20);
    let issuer2Prices = new BTreeMap();
    issuer2Prices.set("A", 20);

    issuers.set(typedHexDID(issuerDID), issuerPrices);
    issuers.set(typedHexDID(issuerDID2), issuer2Prices);

    let schemas = new BTreeMap();
    schemas.set(schemaId, {
      issuers,
      verifiers,
    });

    await dock.trustRegistry.addSchemaMetadata(
      convenerDID,
      trustRegistryId,
      schemas,
      convenerPair,
      dock
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: Object.fromEntries(
        [...issuers.entries()].map(([issuer, prices]) => [
          JSON.stringify({ did: issuer.asDid }),
          Object.fromEntries([...prices.entries()]),
        ])
      ),
      verifiers: [...verifiers.values()]
        .map((verifier) => ({ did: verifier.asDid }))
        .sort((a, b) => a.did.localeCompare(b.did)),
    });

    let schemasUpdate = new BTreeMap();

    verifiers = new BTreeSet();
    verifiers.add(typedHexDID(issuerDID));
    verifiers.add(typedHexDID(issuerDID2));

    issuers = new BTreeMap();
    issuerPrices = new BTreeMap();
    issuerPrices.set("A", 65);
    issuer2Prices = new BTreeMap();
    issuer2Prices.set("A", 75);

    issuers.set(typedHexDID(issuerDID), issuerPrices);
    issuers.set(typedHexDID(issuerDID2), issuer2Prices);

    schemasUpdate.set(schemaId, {
      issuers: {
        Set: issuers,
      },
    });

    await dock.trustRegistry.updateSchemaMetadata(
      convenerDID,
      trustRegistryId,
      schemasUpdate,
      convenerPair,
      dock
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: Object.fromEntries(
        [...issuers.entries()].map(([issuer, prices]) => [
          JSON.stringify({ did: issuer.asDid }),
          Object.fromEntries([...prices.entries()]),
        ])
      ),
      verifiers: [...verifiers.values()]
        .map((verifier) => ({ did: verifier.asDid }))
        .sort((a, b) => a.did.localeCompare(b.did)),
    });

    schemasUpdate = new BTreeMap();
    issuer2Prices = new BTreeMap();
    issuer2Prices.set("A", 25);
    issuer2Prices.set("B", 36);

    let issuersUpdate = new BTreeMap();
    issuersUpdate.set(typedHexDID(issuerDID2), { Set: issuer2Prices });
    schemasUpdate.set(schemaId, {
      issuers: {
        Modify: issuersUpdate,
      },
    });
    issuers = new BTreeMap();
    issuers.set(typedHexDID(issuerDID2), issuer2Prices);
    issuers.set(typedHexDID(issuerDID), issuerPrices);
    schemas.set(schemaId, { issuers, verifiers: schemas.get(schemaId).verifiers });

    await dock.trustRegistry.updateSchemaMetadata(
      issuerDID2,
      trustRegistryId,
      schemasUpdate,
      issuerPair2,
      dock
    );

    expect(
      (
        await dock.api.query.trustRegistry.trustRegistrySchemasMetadata(
          schemaId,
          trustRegistryId
        )
      ).toJSON()
    ).toEqual({
      issuers: Object.fromEntries(
        [...issuers.entries()].map(([issuer, prices]) => [
          JSON.stringify({ did: issuer.asDid }),
          Object.fromEntries([...prices.entries()]),
        ])
      ),
      verifiers: [...verifiers.values()]
        .map((verifier) => ({ did: verifier.asDid }))
        .sort((a, b) => a.did.localeCompare(b.did)),
    });
  });
});
