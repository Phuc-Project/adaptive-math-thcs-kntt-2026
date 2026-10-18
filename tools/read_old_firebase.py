import urllib.request, json, sys, os

sys.stdout.reconfigure(encoding='utf-8')

API_KEY_OLD = 'AIzaSyDRnPMzWOboBIMvMK0nQu6OVc--6c8b2Rs'

def sign_in(email, pwd):
    url = f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY_OLD}'
    req = urllib.request.Request(url, data=json.dumps({
        'email': email, 'password': pwd, 'returnSecureToken': True
    }).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

extracted = {}

try:
    st = sign_in('student_demo2026@gmail.com', 'AdaptiveMath2026!')
    print('Student signed in, UID:', st['localId'])

    doc_url = f'https://firestore.googleapis.com/v1/projects/adaptivemath-36726/databases/(default)/documents/users/{st["localId"]}?key={API_KEY_OLD}'
    req_doc = urllib.request.Request(doc_url, headers={'Authorization': f'Bearer {st["idToken"]}'})
    with urllib.request.urlopen(req_doc) as resp:
        extracted['student_user'] = json.loads(resp.read().decode())

    sub_url = f'https://firestore.googleapis.com/v1/projects/adaptivemath-36726/databases/(default)/documents/learners/{st["localId"]}/data?key={API_KEY_OLD}'
    req_sub = urllib.request.Request(sub_url, headers={'Authorization': f'Bearer {st["idToken"]}'})
    with urllib.request.urlopen(req_sub) as resp:
        extracted['student_learner_data'] = json.loads(resp.read().decode())
except Exception as e:
    print('Student Error:', e)

try:
    tc = sign_in('giaovien_toan9_2026@gmail.com', 'AdaptiveMath2026!')
    print('Teacher signed in, UID:', tc['localId'])
    doc_tc = f'https://firestore.googleapis.com/v1/projects/adaptivemath-36726/databases/(default)/documents/users/{tc["localId"]}?key={API_KEY_OLD}'
    req_tc = urllib.request.Request(doc_tc, headers={'Authorization': f'Bearer {tc["idToken"]}'})
    with urllib.request.urlopen(req_tc) as resp:
        extracted['teacher_user'] = json.loads(resp.read().decode())

    # Query classes for teacher
    classes_query_url = f'https://firestore.googleapis.com/v1/projects/adaptivemath-36726/databases/(default)/documents:runQuery?key={API_KEY_OLD}'
    q = {
        'structuredQuery': {
            'from': [{'collectionId': 'classes'}],
            'where': {
                'fieldFilter': {
                    'field': {'fieldPath': 'teacherId'},
                    'op': 'EQUAL',
                    'value': {'stringValue': tc['localId']}
                }
            }
        }
    }
    req_q = urllib.request.Request(classes_query_url, data=json.dumps(q).encode(), headers={
        'Authorization': f'Bearer {tc["idToken"]}',
        'Content-Type': 'application/json'
    })
    with urllib.request.urlopen(req_q) as resp:
        extracted['teacher_classes'] = json.loads(resp.read().decode())
except Exception as e:
    print('Teacher Error:', e)

out_file = os.path.join(os.path.dirname(__file__), 'extracted_old_firebase.json')
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(extracted, f, ensure_ascii=False, indent=2)

print('Saved extracted data to:', out_file)
