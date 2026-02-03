#!/usr/bin/env python3
"""Download Douyin video by extracting video src from page via Playwright."""
import asyncio
import sys
import subprocess
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else ""
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/douyin_video.mp4"

async def run():
    if not URL:
        print("Usage: dy-download2.py <douyin_share_url> [output_path]")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="zh-CN"
        )
        page = await ctx.new_page()

        # Intercept network requests to capture video URLs
        video_urls = []
        async def handle_response(response):
            url = response.url
            ct = response.headers.get('content-type', '')
            if 'video' in ct or '.mp4' in url or 'play' in url:
                video_urls.append(url)

        page.on("response", handle_response)

        print(f"Loading: {URL}")
        await page.goto(URL, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(5)

        # Also try to find video element src
        video_src = await page.evaluate("""() => {
            const videos = document.querySelectorAll('video');
            const srcs = [];
            videos.forEach(v => {
                if (v.src) srcs.push(v.src);
                const sources = v.querySelectorAll('source');
                sources.forEach(s => { if (s.src) srcs.push(s.src); });
            });
            return srcs;
        }""")

        # Also check for xgplayer data
        xg_src = await page.evaluate("""() => {
            try {
                // Try to find video data in page scripts
                const scripts = document.querySelectorAll('script');
                for (const s of scripts) {
                    const text = s.textContent;
                    if (text.includes('playAddr') || text.includes('play_addr')) {
                        const match = text.match(/"play_addr".*?"url_list":\["([^"]+)"/);
                        if (match) return [match[1].replace(/\\u002F/g, '/')];
                        const match2 = text.match(/"playAddr".*?"src":"([^"]+)"/);
                        if (match2) return [match2[1]];
                    }
                }
            } catch(e) {}
            return [];
        }""")

        all_urls = list(set(video_src + xg_src + [u for u in video_urls if 'mp4' in u or 'video' in u]))

        if all_urls:
            print(f"\nFound {len(all_urls)} video URL(s):")
            for u in all_urls:
                print(f"  {u[:120]}...")

            # Download the first valid URL
            best = all_urls[0]
            print(f"\nDownloading to {OUT}...")
            result = subprocess.run([
                "curl", "-L", "-o", OUT, "-s", "--max-time", "30",
                "-H", "Referer: https://www.douyin.com/",
                "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                best
            ], capture_output=True, text=True, timeout=60)

            if result.returncode == 0:
                import os
                size = os.path.getsize(OUT) if os.path.exists(OUT) else 0
                print(f"✅ Downloaded! Size: {size/1024/1024:.1f} MB")
            else:
                print(f"❌ Download failed: {result.stderr}")
        else:
            print("No video URLs found. Page might need login or has anti-bot protection.")
            # Take screenshot for debugging
            await page.screenshot(path="/tmp/dy-debug.png")
            text = await page.inner_text("body")
            print(f"\nPage text (first 500 chars):\n{text[:500]}")

        # Get video title/description
        title = await page.evaluate("""() => {
            const el = document.querySelector('[class*="title"], [class*="desc"], h1');
            return el ? el.innerText : '';
        }""")
        if title:
            print(f"\nVideo title: {title[:200]}")

        await browser.close()

asyncio.run(run())
