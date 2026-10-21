import ZAI from "z-ai-web-dev-sdk";

async function main() {
  const zai = await ZAI.create();
  // try reading the page
  try {
    const res = await zai.functions.invoke("web_reader", {
      url: "https://help.brevo.com/hc/en-us/articles/115000188150-Troubleshooting-Issues-with-Brevo-SMTP",
    });
    const text = typeof res === "string" ? res : JSON.stringify(res);
    const idx = text.toLowerCase().indexOf("525");
    console.log(idx >= 0 ? text.slice(Math.max(0, idx - 400), idx + 1200) : text.slice(0, 1500));
  } catch (e) {
    console.log("READER ERR:", (e as Error).message);
  }
}
main();
