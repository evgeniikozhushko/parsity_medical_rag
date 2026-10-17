import 'dotenv/config';
import { createEmbeddings } from "../../lib/openai";

async function main() {
  const result = await createEmbeddings(["In the beginning God created the heaven and the earth."]);
  console.log("is a list:", Array.isArray(result));
  console.log("items:", result.length); // expect 1: one text in, one vector out
  console.log("first item:", result[0]);
}

main();