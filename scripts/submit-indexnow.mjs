import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const indexNowKey = "c2b9ea7f50771b8729463bdcd11504e5";
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const keyFile = path.resolve(
  scriptDirectory,
  `../apps/storefront/public/${indexNowKey}.txt`,
);

export function readSitemapUrls(xml, expectedOrigin) {
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(
    (match) => match[1],
  );
  if (locations.length === 0 || locations.length > 10_000) {
    throw new Error("sitemap must contain between 1 and 10,000 URLs");
  }
  for (const location of locations) {
    if (new URL(location).origin !== expectedOrigin) {
      throw new Error("sitemap contains a URL outside the storefront origin");
    }
  }
  return locations;
}

async function submitIndexNow(baseUrl = "https://perfumeaura.com") {
  const origin = new URL(baseUrl).origin;
  const storedKey = (await readFile(keyFile, "utf8")).trim();
  if (storedKey !== indexNowKey) {
    throw new Error("IndexNow key file does not match its public filename");
  }

  const sitemapResponse = await fetch(`${origin}/sitemap.xml`);
  if (!sitemapResponse.ok) {
    throw new Error(`sitemap request failed with ${sitemapResponse.status}`);
  }
  const urlList = readSitemapUrls(await sitemapResponse.text(), origin);
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(origin).host,
      key: indexNowKey,
      keyLocation: `${origin}/${indexNowKey}.txt`,
      urlList,
    }),
  });
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow submission failed with ${response.status}`);
  }
  process.stdout.write(
    `IndexNow accepted ${urlList.length} storefront URLs (${response.status}).\n`,
  );
}

function selfTest() {
  assert.deepEqual(
    readSitemapUrls(
      "<urlset><url><loc>https://perfumeaura.com/</loc></url><url><loc>https://perfumeaura.com/about</loc></url></urlset>",
      "https://perfumeaura.com",
    ),
    ["https://perfumeaura.com/", "https://perfumeaura.com/about"],
  );
  assert.throws(
    () =>
      readSitemapUrls(
        "<urlset><url><loc>https://example.com/</loc></url></urlset>",
        "https://perfumeaura.com",
      ),
    /outside the storefront origin/u,
  );
  process.stdout.write("IndexNow self-test passed.\n");
}

if (process.argv[2] === "self-test") {
  selfTest();
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await submitIndexNow(process.argv[2]);
}
