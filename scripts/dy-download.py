#!/usr/bin/env python3
"""Download Douyin video: get cookies via Playwright, then download."""
import asyncio
import sys
import json
import subprocess
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else ""
COOKIE_FILE = "/tmp/dy-cookies.txt"

async def run():
    if not URL:
        print("Usage: dy-download.py <douyin_url>")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="zh-CN"
        )
        page = await ctx.new_page()
        
        # Visit douyin to get fresh cookies
        print("Getting fresh Douyin cookies...")
        await page.goto("https://www.douyin.com", wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(3)
        
        cookies = await ctx.cookies()
        
        # Write Netscape format cookie file
        with open(COOKIE_FILE, 'w') as f:
            f.write("# Netscape HTTP Cookie File\n")
            for c in cookies:
                domain = c.get('domain', '')
                flag = "TRUE" if domain.startswith('.') else "FALSE"
                path = c.get('path', '/')
                secure = "TRUE" if c.get('secure') else "FALSE"
                expires = str(int(c.get('expires', 0)))
                name = c.get('name', '')
                value = c.get('value', '')
                f.write(f"{domain}\t{flag}\t{path}\t{secure}\t{expires}\t{name}\t{value}\n")
        
        print(f"Saved {len(cookies)} cookies to {COOKIE_FILE}")
        await browser.close()
    
    # Now download with yt-dlp
    print(f"\nDownloading: {URL}")
    cmd = [
        "yt-dlp", URL,
        "--cookies", COOKIE_FILE,
        "-o", "/tmp/douyin_video.mp4",
        "--no-check-certificates",
        "--force-overwrites",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    print(result.stdout)
    if result.stderr:
        print(result.stderr[-1000:])
    print(f"\nReturn code: {result.returncode}")

asyncio.run(run())
