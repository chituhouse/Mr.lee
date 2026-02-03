#!/usr/bin/env python3
"""Search Sogou Weixin and specific article URLs."""
import asyncio
from playwright.async_api import async_playwright

SEARCHES = [
    ('https://weixin.sogou.com/weixin?type=2&query=%E7%A4%BC%E8%B2%8C%E5%A4%AA%E5%A4%AA%E5%92%8Cemogirl', '微信-精确'),
    ('https://www.sogou.com/web?query=%E5%8F%8D%E5%B7%AE%E5%8F%8C%E4%BA%BA%E5%8D%9A%E4%B8%BB+%E9%97%BA%E8%9C%9C%E7%BB%84%E5%90%88+%E6%8A%96%E9%9F%B3+%E5%B0%8F%E7%BA%A2%E4%B9%A6+%E6%8E%A8%E8%8D%90+2025+%E8%B4%A6%E5%8F%B7', '搜狗-双人推荐'),
    ('https://www.sogou.com/web?query=%E7%B1%BB%E4%BC%BC%E6%96%B9%E5%9C%86%E9%98%BF%E7%88%86+%E5%8F%8D%E5%B7%AE%E5%8D%9A%E4%B8%BB+%E6%8E%A8%E8%8D%90+%E6%8A%96%E9%9F%B3+%E5%B0%8F%E7%BA%A2%E4%B9%A6', '搜狗-类似方圆阿爆'),
    ('https://www.sogou.com/web?query=%E6%8A%96%E9%9F%B3+%E5%8F%8D%E5%B7%AE%E9%97%BA%E8%9C%9C+%E5%A5%B3%E7%94%9F%E7%BB%84%E5%90%88+%E6%90%9E%E7%AC%91+%E7%83%AD%E9%97%A8%E8%B4%A6%E5%8F%B7+%E6%8E%92%E8%A1%8C', '搜狗-热门闺蜜组合'),
]

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="zh-CN"
        )
        page = await ctx.new_page()

        for url, label in SEARCHES:
            print(f"\n{'='*50}")
            print(f"{label}")
            print('='*50)
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                await asyncio.sleep(3)
                text = await page.inner_text("body")
                lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 10]
                printed = 0
                for line in lines:
                    if printed >= 50:
                        break
                    print(line)
                    printed += 1
            except Exception as e:
                print(f"Error: {e}")

        await browser.close()

asyncio.run(run())
