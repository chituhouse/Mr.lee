#!/usr/bin/env python3
"""Search Baidu for account info using Playwright."""
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

        # Search 1: Find the account
        print(f"=== 百度搜索: {KEYWORD} 博主 ===")
        url = f'https://www.baidu.com/s?wd="{KEYWORD}" 博主 抖音 小红书 粉丝'
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(3)
        text = await page.inner_text("body")
        # Filter out noise
        lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 5]
        for line in lines[:80]:
            print(line)

        # Search 2: Find similar accounts
        print(f"\n\n=== 百度搜索: 类似 {KEYWORD} 的账号 ===")
        url2 = f'https://www.baidu.com/s?wd="{KEYWORD}" 类似 同类 账号 推荐'
        await page.goto(url2, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(3)
        text2 = await page.inner_text("body")
        lines2 = [l.strip() for l in text2.split('\n') if l.strip() and len(l.strip()) > 5]
        for line in lines2[:80]:
            print(line)

        # Search 3: The content style - personality contrast duo accounts
        print(f"\n\n=== 百度搜索: 反差人设 闺蜜 情侣 博主推荐 ===")
        url3 = 'https://www.baidu.com/s?wd=反差人设 闺蜜博主 emo 礼貌 搞笑 抖音 小红书 推荐 账号'
        await page.goto(url3, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(3)
        text3 = await page.inner_text("body")
        lines3 = [l.strip() for l in text3.split('\n') if l.strip() and len(l.strip()) > 5]
        for line in lines3[:80]:
            print(line)

        await browser.close()

asyncio.run(run())
