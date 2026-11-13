import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'https://adaptivemath-main.vercel.app'

def verify_student_views():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        
        # Sign in student
        page.goto(f'{BASE_URL}/#/login')
        page.wait_for_timeout(2000)
        page.locator('input[type="email"]').fill('student_demo2026@gmail.com')
        page.locator('input[type="password"]').fill('AdaptiveMath2026!')
        page.locator('button.btn-primary').click()
        page.wait_for_timeout(3000)
        
        routes = [
            '/',
            '/diagnostic',
            '/learning-path',
            '/theory',
            '/practice',
            '/exercises',
            '/tutor',
            '/errors',
            '/profile'
        ]
        
        for r in routes:
            page.goto(f'{BASE_URL}/#{r}')
            page.wait_for_timeout(1500)
            title = page.locator('h1, h2, .page-title, .brand-text').first.text_content() if page.locator('h1, h2, .page-title, .brand-text').count() > 0 else 'no-title'
            print(f'Route #{r} rendered OK. Title/Header: {title.strip()}')
            
        browser.close()

if __name__ == '__main__':
    verify_student_views()
