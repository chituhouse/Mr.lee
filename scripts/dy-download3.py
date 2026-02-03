#!/usr/bin/env python3
"""Download Douyin video by extracting SSR data from page."""
import asyncio
import sys
import json
import re
import subprocess
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else ""
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/douyin_video.mp4"

async def run():
    if not URL:
        print("Usage: dy-download3.py <douyin_share_url> [output_path]")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="zh-CN"
        )
        page = await ctx.new_page()

        # Capture all XHR/fetch responses for video data
        api_data = []
        async def on_response(resp):
            url = resp.url
            if 'detail' in url or 'aweme' in url or 'play' in url:
                try:
                    body = await resp.text()
                    if body and len(body) > 100:
                        api_data.append({"url": url, "body": body[:5000]})
                except:
                    pass
        page.on("response", on_response)

        print(f"Loading: {URL}")
        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)

        # Method 1: Extract from SSR render data in script tags
        video_url = await page.evaluate(r"""() => {
            // Look for RENDER_DATA or __NEXT_DATA__
            const scripts = document.querySelectorAll('script#RENDER_DATA, script[id*="RENDER"], script[type="application/json"]');
            for (const s of scripts) {
                try {
                    let text = s.textContent;
                    // RENDER_DATA is URL-encoded
                    if (s.id === 'RENDER_DATA') {
                        text = decodeURIComponent(text);
                    }
                    const data = JSON.parse(text);
                    const str = JSON.stringify(data);
                    // Find play_addr URL
                    const match = str.match(/"play_addr"[^}]*"url_list"\s*:\s*\["([^"]+)"/);
                    if (match) return match[1].replace(/\\u002F/g, '/');
                    // Alternative: look for video.playApi or playAddr
                    const match2 = str.match(/"playApi"\s*:\s*"([^"]+)"/);
                    if (match2) return match2[1].replace(/\\u002F/g, '/');
                    // Try to find any douyin video CDN URL
                    const match3 = str.match(/(https?:\/\/[^"]*douyinvod[^"]*\.mp4[^"]*)/);
                    if (match3) return match3[1].replace(/\\u002F/g, '/');
                    const match4 = str.match(/(https?:\/\/[^"]*v\d+-[^"]*\.douyinvod[^"]*)/);
                    if (match4) return match4[1].replace(/\\u002F/g, '/');
                } catch(e) {}
            }
            
            // Method 2: Search in all script tags
            const allScripts = document.querySelectorAll('script');
            for (const s of allScripts) {
                const text = s.textContent || '';
                if (text.length < 100) continue;
                try {
                    // URL-decode if needed
                    let decoded = text;
                    if (text.includes('%22')) {
                        try { decoded = decodeURIComponent(text); } catch(e) {}
                    }
                    const match = decoded.match(/(https?:\/\/[^"'\s]*(?:douyinvod|v\d+-dy)[^"'\s]*\.mp4[^"'\s]*)/);
                    if (match) return match[1];
                } catch(e) {}
            }
            return null;
        }""")

        # Method 2: Check API responses
        if not video_url:
            for item in api_data:
                try:
                    match = re.search(r'(https?://[^"\'\\]+(?:douyinvod|ixigua|bytevcloudtp)[^"\'\\]+)', item['body'])
                    if match:
                        video_url = match.group(1)
                        break
                except:
                    pass

        # Method 3: Get from page HTML source
        if not video_url:
            html = await page.content()
            # Try URL-decoded search
            try:
                decoded = re.sub(r'%([0-9A-Fa-f]{2})', lambda m: chr(int(m.group(1), 16)), html)
            except:
                decoded = html
            match = re.search(r'(https?://[^"\'\\<>\s]+(?:douyinvod|ixigua|bytevcloudtp|byteimg)[^"\'\\<>\s]*\.mp4[^"\'\\<>\s]*)', decoded)
            if match:
                video_url = match.group(1)

        if video_url:
            print(f"\n✅ Found video URL:\n{video_url[:200]}")
            print(f"\nDownloading to {OUT}...")
            result = subprocess.run([
                "curl", "-L", "-o", OUT, "--max-time", "60",
                "-H", f"Referer: https://www.douyin.com/",
                "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                video_url
            ], capture_output=True, text=True, timeout=90)
            import os
            size = os.path.getsize(OUT) if os.path.exists(OUT) else 0
            print(f"Downloaded: {size/1024/1024:.1f} MB")
            if size < 0.5 * 1024 * 1024:
                print("⚠️ File too small, might not be the real video.")
        else:
            print("\n❌ Could not extract video URL")
            # Debug: show RENDER_DATA existence
            has_render = await page.evaluate("() => !!document.querySelector('#RENDER_DATA')")
            print(f"Has RENDER_DATA: {has_render}")
            if has_render:
                rd = await page.evaluate("() => decodeURIComponent(document.querySelector('#RENDER_DATA').textContent).substring(0, 2000)")
                print(f"RENDER_DATA preview:\n{rd}")
            await page.screenshot(path="/tmp/dy-debug2.png")
            print("Debug screenshot: /tmp/dy-debug2.png")

        # Get video info
        info = await page.evaluate("""() => {
            try {
                const rd = document.querySelector('#RENDER_DATA');
                if (rd) {
                    const text = decodeURIComponent(rd.textContent);
                    const data = JSON.parse(text);
                    const str = JSON.stringify(data);
                    const descMatch = str.match(/"desc"\s*:\s*"([^"]{1,200})"/);
                    const authorMatch = str.match(/"nickname"\s*:\s*"([^"]+)"/);
                    return {
                        desc: descMatch ? descMatch[1] : null,
                        author: authorMatch ? authorMatch[1] : null
                    };
                }
            } catch(e) {}
            return {};
        }""")
        if info.get('desc'):
            print(f"\n📝 Description: {info['desc']}")
        if info.get('author'):
            print(f"👤 Author: {info['author']}")

        await browser.close()

asyncio.run(run())
