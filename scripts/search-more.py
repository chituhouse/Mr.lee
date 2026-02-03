#!/usr/bin/env python3
"""More targeted searches for 礼貌太太和emogirl and similar accounts."""
import asyncio
from playwright.async_api import async_playwright

SEARCHES = [
    '礼貌太太和emogirl 抖音号',
    '礼貌太太和emogirl 小红书号 粉丝',
    '礼貌太太 emogirl 快手',
    '抖音 双人组合 反差博主 排行 推荐 2025 闺蜜 emo甜妹',
    '小红书 反差闺蜜 双人博主 推荐 2025 酷girl 温柔',
    '抖音 情侣反差 夫妻搞笑 博主推荐 一个温柔一个暴躁',
]

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            viewport={"width": 1280, "height": 800},
            locale="zh-CN"
        )
        page = await ctx.new_page()

        for query in SEARCHES:
            print(f"\n{'='*50}")
            print(f"搜索: {query}")
            print('='*50)
            url = f'https://www.baidu.com/s?wd={query}'
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                await asyncio.sleep(2)
                text = await page.inner_text("body")
                lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 10]
                skip = ['百度', '广告', '换一换', '搜索设置', '输入法', '帮助举报', '用户反馈', '企业推广', '京ICP', '使用百度']
                printed = 0
                for line in lines:
                    if printed >= 40:
                        break
                    if any(s in line for s in skip):
                        continue
                    if '实时热点' in line or '资讯' == line.strip():
                        continue
                    print(line)
                    printed += 1
            except Exception as e:
                print(f"Error: {e}")

        await browser.close()

asyncio.run(run())
