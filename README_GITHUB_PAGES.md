# FacilityManager v0.13.3 · Build 17 — GitHub Pages 배포

## 업로드

`FacilityManager_v0.13.3_Build17_GITHUB_PAGES.zip`의 내용물을 저장소 루트에 올립니다.

GitHub Pages 설정:
- Source: Deploy from a branch
- Branch: main
- Folder: /(root)
- HTTPS 사용

배포 후 실행 주소:
- https://bak2ya.github.io/FacilityManager/

## 중요: 기관 운영 파일

`site-config.json`과 `latest-db.json`은 기관별 운영 상태를 가질 수 있습니다.
이미 운영 중인 저장소에 더 최신 값이 있으면 **ZIP의 기본 파일로 무조건 덮어쓰지 말고 기존 운영 파일을 유지**하세요.
실제 `*.facdb`는 GitHub에 올리지 않습니다.

## Build 17에서 필요한 앱 파일

오프라인 사용 준비와 PWA/FACMAP 동작을 위해 다음 파일이 함께 배포되어야 합니다.
- `index.html`
- `service-worker.js`
- `facmap-core.js`
- `manifest.webmanifest`
- `icons/`
- `site-config.json`
- `robots.txt`

`latest-db.json`은 데이터 최신 여부 확인용 기관 기준 파일이며 오프라인 캐시 대상이 아닙니다.

## 오프라인 사용

1. 온라인 상태에서 FacilityManager를 정상 실행합니다.
2. 시설 데이터를 `데이터 불러오기`로 연결합니다.
3. `설정 → 데이터 → 오프라인 사용`에서 `오프라인 사용 준비`를 누릅니다.
4. `앱 파일 준비됨 · 시설 데이터 준비됨` 상태를 확인합니다.
5. 이후 인터넷이 없는 환경에서도 준비된 앱 shell과 로컬 시설 데이터를 사용할 수 있습니다.

브라우저의 사이트 데이터·캐시·저장 공간을 삭제하면 다시 준비해야 할 수 있습니다.
오프라인 상태에서는 `latest-db.json`을 확인할 수 없으므로 최신 여부 확인은 실패하는 것이 정상입니다.

## PieniPlan 연결

- PieniPlan 실행: https://bak2ya.github.io/PieniPlan/
- PieniPlan GitHub: https://github.com/Bak2ya/PieniPlan

도면 제작·편집·트레이싱·공간 정의는 PieniPlan에서 진행합니다.

## Build 17 확인 포인트

1. Build 15의 상단 층 island / 우측 floating tools / 패널 동작이 그대로 유지되는지
2. 설정 데이터 버튼이 `데이터 불러오기 / 데이터 내보내기 / 최신 여부 확인`으로 보이는지
3. 오프라인 카드가 `앱 파일 준비`와 `시설 데이터 준비`를 구분해 표시하는지
4. 준비 완료 후 인터넷을 끄고 완전 종료/재실행해도 앱이 열리는지
5. 오프라인에서 저장된 FACDB가 자동으로 열리는지
6. 오프라인 최신 여부는 `확인할 수 없음`으로 나타나는지
7. 인터넷 복구 후 최신 여부 확인이 정상화되는지
8. FACMAP 가져오기와 PWA 아이콘/manifest가 정상인지

### Build 17 추가 확인
- iPhone/iPad에서 `.facdb` 파일 선택이 활성화되는지
- 데이터 연결 전 floating controls가 보이지 않는지
- 모바일 패널을 열었을 때 `>` 손잡이만 패널 왼쪽 경계에 남는지
- 위치 island 폭이 건물명 길이에 따라 자연스럽게 변하는지
- `표시 → 도면 배율` 슬라이더와 휠/핀치 확대율이 동기화되는지
