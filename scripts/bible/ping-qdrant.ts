import { qdrant } from "../../lib/qdrant";

async function main() {
  const result = await qdrant.getCollections(); // ask Qdrant what collections exist
  console.log(result);
}

main();