import urllib.request, json, sys, os, time

sys.stdout.reconfigure(encoding='utf-8')

API_KEY_NEW = 'AIzaSyDSkNdcpVV1y-M-M5p2-I6EkGmG5DF51vI'
PROJECT_ID_NEW = 'adaptivemath-tmhp-2026'

def register_user(email, password, display_name):
    # Try sign up
    url = f'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY_NEW}'
    body = {
        'email': email,
        'password': password,
        'returnSecureToken': True
    }
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f'Created new user {email}: UID {data["localId"]}')
            id_token = data.get('idToken')
            local_id = data.get('localId')
            # Update display name
            update_url = f'https://identitytoolkit.googleapis.com/v1/accounts:update?key={API_KEY_NEW}'
            up_body = {
                'idToken': id_token,
                'displayName': display_name,
                'returnSecureToken': True
            }
            req_up = urllib.request.Request(update_url, data=json.dumps(up_body).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req_up) as up_resp:
                up_data = json.loads(up_resp.read().decode())
                return {
                    'localId': local_id,
                    'idToken': up_data.get('idToken', id_token)
                }
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode()
        if 'EMAIL_EXISTS' in err_msg:
            # Sign in instead
            sign_url = f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY_NEW}'
            req_sign = urllib.request.Request(sign_url, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req_sign) as s_resp:
                data = json.loads(s_resp.read().decode())
                print(f'User {email} already exists, signed in: UID {data["localId"]}')
                return data
        else:
            raise Exception(f'Error registering {email}: {err_msg}')

print('1. Registering student...')
student_auth = register_user('student_demo2026@gmail.com', 'AdaptiveMath2026!', 'Nguyễn Minh Quân (Học sinh)')
student_uid = student_auth['localId']
student_token = student_auth['idToken']

print('2. Registering teacher...')
teacher_auth = register_user('giaovien_toan9_2026@gmail.com', 'AdaptiveMath2026!', 'Thầy Hoàng Phúc (Giáo viên)')
teacher_uid = teacher_auth['localId']
teacher_token = teacher_auth['idToken']

print('3. Populating Firestore for student and teacher...')

# Helper to write doc via REST API
def set_firestore_doc(collection, doc_id, fields, token):
    url = f'https://firestore.googleapis.com/v1/projects/{PROJECT_ID_NEW}/databases/(default)/documents/{collection}/{doc_id}?key={API_KEY_NEW}'
    # Firestore REST requires field types
    # fields is a dict of {key: value}
    fs_fields = {}
    for k, v in fields.items():
        if v is None:
            fs_fields[k] = {'nullValue': None}
        elif isinstance(v, bool):
            fs_fields[k] = {'booleanValue': v}
        elif isinstance(v, int):
            fs_fields[k] = {'integerValue': str(v)}
        elif isinstance(v, float):
            fs_fields[k] = {'doubleValue': v}
        elif isinstance(v, str):
            fs_fields[k] = {'stringValue': v}
        elif isinstance(v, dict):
            fs_fields[k] = {'mapValue': {'fields': v}}
        elif isinstance(v, list):
            fs_fields[k] = {'arrayValue': {'values': v}}
    
    req = urllib.request.Request(url, data=json.dumps({'fields': fs_fields}).encode(), method='PATCH', headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f'Error setting {collection}/{doc_id}:', e.code, e.read().decode())
        raise

# Teacher user document
now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
teacher_doc = {
    'email': 'giaovien_toan9_2026@gmail.com',
    'displayName': 'Thầy Hoàng Phúc (Giáo viên)',
    'role': 'teacher',
    'grade': 9,
    'classCode': 'TOAN9A',
    'className': 'Toán 9A - THCS Kết Nối Tri Thức 2026',
    'schoolName': 'THCS Kết Nối Tri Thức',
    'xp': 150,
    'level': 1,
    'currentStreak': 3,
    'longestStreak': 5,
    'masteredTopics': 12,
    'totalQuestions': 45,
    'totalSessions': 8,
    'unresolvedErrors': 0,
    'hasDiagnostic': False,
    'goal': None,
    'dailyMinutes': 45,
    'createdAt': now_iso,
    'lastLoginAt': now_iso,
    'lastActiveAt': now_iso
}
set_firestore_doc('users', teacher_uid, teacher_doc, teacher_token)
print(f'Created users/{teacher_uid} (Teacher)')

# Teacher Class: TOAN9A
class_doc = {
    'name': 'Toán 9A - THCS Kết Nối Tri Thức 2026',
    'teacherId': teacher_uid,
    'teacherName': 'Thầy Hoàng Phúc (Giáo viên)',
    'grade': 9,
    'schoolYear': '2025-2026',
    'subject': 'Toán THCS',
    'createdAt': now_iso,
    'totalStudents': 1
}
set_firestore_doc('classes', 'TOAN9A', class_doc, teacher_token)
print('Created classes/TOAN9A')

# Student user document
student_doc = {
    'email': 'student_demo2026@gmail.com',
    'displayName': 'Nguyễn Minh Quân (Học sinh)',
    'role': 'student',
    'grade': 9,
    'goal': 'vao-10',
    'dailyMinutes': 45,
    'classCode': 'TOAN9A',
    'className': 'Toán 9A - THCS Kết Nối Tri Thức 2026',
    'schoolName': 'THCS Kết Nối Tri Thức',
    'xp': 320,
    'level': 2,
    'currentStreak': 4,
    'longestStreak': 7,
    'masteredTopics': 6,
    'totalQuestions': 38,
    'totalSessions': 6,
    'unresolvedErrors': 1,
    'hasDiagnostic': True,
    'createdAt': now_iso,
    'lastLoginAt': now_iso,
    'lastActiveAt': now_iso
}
set_firestore_doc('users', student_uid, student_doc, student_token)
print(f'Created users/{student_uid} (Student)')

# Student Learner Data: Profile
profile_blob = {
    'grade': 9,
    'goal': 'vao-10',
    'dailyMinutes': 45,
    'deadline': None,
    'selfLevel': 'kha',
    'weakTopicIds': ['t_9_can_bac_hai', 't_9_he_phuong_trinh'],
    'createdAt': now_iso,
    'updatedAt': now_iso
}
set_firestore_doc(f'learners/{student_uid}/data', 'profile', {
    'json': json.dumps(profile_blob, ensure_ascii=False),
    'updatedAt': int(time.time() * 1000)
}, student_token)
print(f'Created learners/{student_uid}/data/profile')

# Student Learner Data: Learner State (BKT/SRS)
learner_blob = {
    'bktStates': {
        't_9_can_bac_hai': {'pKnown': 0.82, 'correctStreak': 3, 'totalAttempts': 8},
        't_9_he_phuong_trinh': {'pKnown': 0.65, 'correctStreak': 1, 'totalAttempts': 5},
        't_9_ham_so_bac_nhat': {'pKnown': 0.91, 'correctStreak': 4, 'totalAttempts': 10}
    },
    'srsCards': {},
    'masteredTopicIds': ['t_9_can_bac_hai', 't_9_ham_so_bac_nhat']
}
set_firestore_doc(f'learners/{student_uid}/data', 'learner', {
    'json': json.dumps(learner_blob, ensure_ascii=False),
    'updatedAt': int(time.time() * 1000)
}, student_token)
print(f'Created learners/{student_uid}/data/learner')

# Student Class Membership in TOAN9A
member_doc = {
    'uid': student_uid,
    'displayName': 'Nguyễn Minh Quân (Học sinh)',
    'grade': 9,
    'xp': 320,
    'level': 2,
    'currentStreak': 4,
    'masteredTopics': 6,
    'totalQuestions': 38,
    'joinedAt': now_iso,
    'help': {
        'status': 'pending',
        'message': 'Thầy ơi, em chưa hiểu rõ bài toán căn thức bậc hai có chứa tham số m.',
        'askedAt': now_iso
    }
}
# Write member doc with structured map fields
member_fields = {
    'uid': {'stringValue': student_uid},
    'displayName': {'stringValue': 'Nguyễn Minh Quân (Học sinh)'},
    'grade': {'integerValue': '9'},
    'xp': {'integerValue': '320'},
    'level': {'integerValue': '2'},
    'currentStreak': {'integerValue': '4'},
    'masteredTopics': {'integerValue': '6'},
    'totalQuestions': {'integerValue': '38'},
    'joinedAt': {'stringValue': now_iso},
    'help': {
        'mapValue': {
            'fields': {
                'status': {'stringValue': 'pending'},
                'message': {'stringValue': 'Thầy ơi, em chưa hiểu rõ bài toán căn thức bậc hai có chứa tham số m.'},
                'askedAt': {'stringValue': now_iso}
            }
        }
    }
}
url_mem = f'https://firestore.googleapis.com/v1/projects/{PROJECT_ID_NEW}/databases/(default)/documents/classes/TOAN9A/members/{student_uid}?key={API_KEY_NEW}'
req_mem = urllib.request.Request(url_mem, data=json.dumps({'fields': member_fields}).encode(), method='PATCH', headers={
    'Authorization': f'Bearer {student_token}',
    'Content-Type': 'application/json'
})
try:
    with urllib.request.urlopen(req_mem) as resp:
        print('Created classes/TOAN9A/members/' + student_uid)
except Exception as e:
    print('Member error:', e)

print('\n=== ALL SEED DATA SUCCESSFULLY MIGRATED & ENRICHED IN adaptivemath-tmhp-2026! ===')
