import bodyParser from "body-parser";
import express from "express";
import {BASE_USER_PORT, REGISTRY_PORT, BASE_ONION_ROUTER_PORT} from "../config";
import {createRandomSymmetricKey, exportSymKey, rsaEncrypt, symEncrypt} from "../crypto";
import { Node, GetNodeRegistryBody } from "../registry/registry";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;

  let lastCircuit: Node[] = [];

  // TODO implement the status route
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  _user.post("/message", (req, res) => {
    lastReceivedMessage = req.body.message;
    return res.status(200).send("success");
  });

  _user.post("/sendMessage", async (req, res) => {
    const {message, destinationUserId} = req.body;
    lastReceivedMessage = message;

    const getallNodes = await fetch(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
    const allNodesData:any = await getallNodes.json();

    const allNodes: GetNodeRegistryBody = allNodesData;

    let shuffledNodes: Node[] = allNodes.nodes.slice();

    shuffledNodes.sort(() => Math.random() - 0.5);
    const randomNodes: Node[] = shuffledNodes.slice(0, 3);
    lastCircuit = randomNodes;

    const first_node = randomNodes[0].nodeId;

    let Final :string = "";

    for (let i = 0; i < randomNodes.length; i++) {
      const symKey = await createRandomSymmetricKey();
      const number = BASE_USER_PORT + destinationUserId ;
      const value = "000000" + number ;

      const before_encryption = value + message ;
      const after_encryption = await symEncrypt(symKey,before_encryption);

      const base64_symKey = await exportSymKey(symKey);
      const encrypt_symKey_rsa = await rsaEncrypt(base64_symKey,randomNodes[i].pubKey);

      const final = encrypt_symKey_rsa + after_encryption ;
      Final = Final + final ; 
    }
    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + first_node}/message`,{
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({message: Final})
    });

    lastSentMessage = message;

    return res.send("success");
  });

  _user.get("/getLastCircuit", (req, res) => {
    const all_id : number[]= lastCircuit.map((node)=>node.nodeId);
    res.json({ result: all_id });
  });


  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
