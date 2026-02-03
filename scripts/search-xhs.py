#!/usr/bin/env python3
"""Search Xiaohongshu for account info and similar accounts using Playwright."""
import asyncio
import json
import sys
from playwright.async_api import async_playwright

KEYWORD = sys.argv[1] if len(sys.argv) > 1 else "礼貌太太和emogirl"

async def search_xhs(keyword):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="zh-CN"
        )
        page = await ctx.new_page()

        # Search for notes
        print(f"=== 小红书搜索: {keyword} ===")
        url = f"https://www.xiaohongshu.com/search_result?keyword={keyword}&source=web_search_result_notes"
        await page.goto(url, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)

        # Try to get note cards
        notes = await page.query_selector_all('section.note-item, div.note-item, a[href*="/explore/"]')
        print(f"Found {len(notes)} note items")

        results = []
        for note in notes[:20]:
            try:
                title_el = await note.query_selector('.title, .note-title, span')
                author_el = await note.query_selector('.author-wrapper .name, .user-name, .author')
                title = await title_el.inner_text() if title_el else ""
                author = await author_el.inner_text() if author_el else ""
                href = await note.get_attribute('href') or ""
                if title or author:
                    results.append({"title": title.strip(), "author": author.strip(), "href": href})
                    print(f"  📝 {title.strip()} | 作者: {author.strip()}")
            except:
                pass

        # Also try to get user results
        print(f"\n=== 小红书用户搜索: {keyword} ===")
        user_url = f"https://www.xiaohongshu.com/search_result?keyword={keyword}&source=web_search_result_notes&type=user"
        await page.goto(user_url, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)

        users = await page.query_selector_all('.user-list-item, .user-item, div[class*="user"]')
        print(f"Found {len(users)} user items")
        for user in users[:10]:
            try:
                name_el = await user.query_selector('.name, .nickname, span')
                desc_el = await user.query_selector('.desc, .signature, p')
                name = await name_el.inner_text() if name_el else ""
                desc = await desc_el.inner_text() if desc_el else ""
                if name:
                    print(f"  👤 {name.strip()} | {desc.strip()}")
            except:
                pass

        # Get page content as fallback
        content = await page.content()
        # Extract any visible text
        text = await page.inner_text('body')
        if len(results) == 0 and len(users) == 0:
            print("\n=== 页面文本 (前2000字) ===")
            print(text[:2000])

        await browser.close()

asyncio.run(search_xhs(KEYWORD))
