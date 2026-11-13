import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'https://adaptivemath-main.vercel.app'

def verify_teacher():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        
        # Sign in teacher
        page.goto(f'{BASE_URL}/#/login')
        page.wait_for_timeout(2000)
        page.locator('input[type="email"]').fill('giaovien_toan9_2026@gmail.com')
        page.locator('input[type="password"]').fill('AdaptiveMath2026!')
        page.locator('button.btn-primary').click()
        page.wait_for_timeout(4000)
        
        # Navigate to #/teacher
        page.goto(f'{BASE_URL}/#/teacher')
        page.wait_for_timeout(3000)
        
        print('Teacher URL after login:', page.url)
        auth_info = page.evaluate('''() => {
            return {
                user: window.AM.auth.currentUser() ? window.AM.auth.currentUser().email : null,
                role: window.AM.auth.role(),
                profile: window.AM.auth.currentProfile(),
                isTeacher: window.AM.auth.isTeacher()
            };
        }''')
        print('AUTH INFO:', auth_info)
        content = page.locator('#app').inner_text()
        print('FULL TEACHER APP CONTENT:\n', content)
        browser.close()

if __name__ == '__main__':
    verify_teacher()
