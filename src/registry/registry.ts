import bodyParser from "body-parser";
import express from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};


export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  let nodeRegistry: GetNodeRegistryBody = {nodes: []} ;

  // TODO implement the status route
  _registry.get("/status", (req, res) => {
    res.send("live");
  });

  _registry.post("/registerNode", (req, res) => {
    const { nodeId, pubKey } = req.body;
    nodeRegistry.nodes.push({ nodeId, pubKey });
    return res.status(200).json({ result: "ok" });
  });

  _registry.get("/getNodeRegistry", (req, res) => {
    res.json(nodeRegistry);
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
