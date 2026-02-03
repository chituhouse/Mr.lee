#!/usr/bin/env python3
"""Search Xiaohongshu - robust version with full page text extraction."""
import asyncio
import sys
from playwright.async_api import async_playwright

KEYWORD = sys.argv[1] if len(sys.argv) > 1 else "礼貌太太和emogirl"

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="zh-CN"
        )
        page = await ctx.new_page()

        # 1) Search notes
        print(f"=== 小红书笔记搜索: {KEYWORD} ===")
        url = f"https://www.xiaohongshu.com/search_result?keyword={KEYWORD}&source=web_search_result_notes"
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(5)
        
        # Save screenshot
        await page.screenshot(path="/tmp/xhs-notes.png", full_page=False)
        print("[screenshot saved: /tmp/xhs-notes.png]")
        
        # Get all text from the page
        body_text = await page.inner_text("body")
        print(body_text[:3000])
        
        # 2) Search users
        print(f"\n\n=== 小红书用户搜索: {KEYWORD} ===")
        user_url = f"https://www.xiaohongshu.com/search_result?keyword={KEYWORD}&source=web_search_result_notes&type=user"
        await page.goto(user_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(5)
        
        await page.screenshot(path="/tmp/xhs-users.png", full_page=False)
        print("[screenshot saved: /tmp/xhs-users.png]")
        
        body_text2 = await page.inner_text("body")
        print(body_text2[:3000])

        await browser.close()

asyncio.run(run())
