import ZAI from "z-ai-web-dev-sdk";

async function main() {
  const zai = await ZAI.create();
  const result = await zai.functions.invoke("web_search", {
    query: "Brevo SMTP error \"525\" \"5.7.1 Unauthorized IP address\" fix where setting disable IP restriction",
    num: 10,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error("SEARCH ERR:", (e as Error).message);
  process.exit(1);
});
