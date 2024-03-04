import bodyParser from "body-parser";
import express from "express";
import {BASE_ONION_ROUTER_PORT, REGISTRY_PORT} from "../config";
import {Node} from "../registry/registry";
import {exportPrvKey, exportPubKey, generateRsaKeyPair, importPrvKey, rsaDecrypt, symDecrypt} from "../crypto";

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestinationPort: number | null = null;

  let rsaKeyPair = await generateRsaKeyPair();
  let pubKey = await exportPubKey(rsaKeyPair.publicKey);
  let privateKey = await exportPrvKey(rsaKeyPair.privateKey); 

  const nodeInfo = {
    nodeId,
    publicKey: pubKey,
    privateKey: privateKey
  };

  // TODO implement the status route
  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage});
  });

  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage});
  });

  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestinationPort });
  });

  onionRouter.get("/getPrivateKey", (req, res) => {
    res.json({ result: privateKey });
  });
  onionRouter.post("/message", async (req, res) => {
    const {message} = req.body;

    const decrypt_rsa = await rsaDecrypt(message.slice(0,344),rsaKeyPair.privateKey);

    const decrypt_symKey = await symDecrypt(decrypt_rsa, message.slice(344));

    const destinationPort = parseInt(decrypt_symKey.slice(0,10),10);
    const Message = decrypt_symKey.slice(10); 

    lastReceivedEncryptedMessage = message;
    lastReceivedDecryptedMessage = Message;
    lastMessageDestinationPort = destinationPort;

    await fetch(`http://localhost:${destinationPort}/message`,{
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({message: Message})
    });

    res.json({success: true});
  });


  const response = await fetch(`http://localhost:${REGISTRY_PORT}/registerNode`, {
    method: "POST",
    body: JSON.stringify({
      nodeId,
      pubKey: pubKey,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  console.log(await response.json());

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}
