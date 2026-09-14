# FacilityManager v0.13.0 · Build 14 — GitHub Pages 배포

## 업로드

`FacilityManager_v0.13.0_Build14_GITHUB_PAGES.zip`의 내용물을 저장소 루트에 올립니다.

GitHub Pages 설정:
- Source: Deploy from a branch
- Branch: main
- Folder: /(root)
- HTTPS 사용

배포 후 실행 주소:
- https://bak2ya.github.io/FacilityManager/

## PieniPlan 연결

도면 제작·편집·트레이싱·공간 정의는 별도 **PieniPlan**에서 진행합니다.

- PieniPlan 실행: https://bak2ya.github.io/PieniPlan/
- PieniPlan GitHub: https://github.com/Bak2ya/PieniPlan

`site-config.json`의 `pieniPlanUrl`로 연결합니다.

## 데이터

실제 `*.facdb`는 GitHub에 올리지 않습니다. 각 기기에서 `DB 불러오기`로 연결합니다.
FACMAP 역시 실제 도면 공개가 허용되지 않는 환경이라면 내부에서 전달합니다.

## Build 14 확인 포인트

1. 데스크톱에서 상시 헤더 없이 도면이 화면 최상단부터 표시되는지
2. `건물명 · 층`을 눌렀을 때 같은 건물 층만 표시되는지
3. 패널을 접으면 빈 세로 레일이 남지 않는지
4. 패널 닫힘 상태에서 호실 클릭 → 빠른 Popover가 나타나는지
5. 패널 열림 상태에서 호실 클릭 → 자동으로 조회 탭이 되는지
6. 모바일에서도 4~5번 원리가 동일한지
7. 휠 한 번으로 확대율이 최대/최소로 튀지 않는지
8. `설정 → 도움말 → 즐겨찾기에 추가` 안내가 모바일/데스크톱 모두 보이는지
9. `설정 → 정보`에서 GitHub/PieniPlan/개발자 연락이 동작하는지
10. `관리` 탭에서 관리자 인증과 변경사항 저장이 가능한지

## 기관 설정 파일

기관별 `site-config.json`과 운영 중인 `latest-db.json`은 기관 설정 파일입니다. 앱 업데이트 시 기관 값을 확인한 뒤 교체하세요.
