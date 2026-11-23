import asyncio, sys, time
from playwright.async_api import async_playwright
async def main(views):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--enable-webgl"])
        for v in views:
            pg = await b.new_page(viewport={"width":1600,"height":900}, device_scale_factor=1.5)
            logs=[]; pg.on("console", lambda m: logs.append(m.text)); pg.on("pageerror", lambda e: logs.append("PAGEERR "+str(e)))
            t=time.time(); await pg.goto(f"http://localhost:8765/index.html?view={v}")
            try: await pg.wait_for_function("window.__ready || window.__err", timeout=170000)
            except Exception as e: print("timeout", e)
            err = await pg.evaluate("window.__err||''")
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=f"out-{v}.png")
            print(v, round(time.time()-t,1), "s", err[:500], [l for l in logs if 'GPU stall' not in l][:6])
            await pg.close()
        await b.close()
asyncio.run(main(sys.argv[1:]))
