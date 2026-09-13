# FacilityManager v0.10.0 · Build 10 — GitHub Pages 배포

## 업로드

`FacilityManager_v0.10.0_Build10_GITHUB_PAGES.zip`의 **내용물 전체**를 GitHub 저장소 루트에 올립니다.

GitHub Pages 설정:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/(root)`
- HTTPS 사용 권장

예상 주소:

`https://<사용자명>.github.io/FacilityManager/`

## 절대 올리지 않을 것

- 실제 운영 FACDB
- 운영 암호/암호화 키
- 교내 잠금정보가 포함된 파일
- 실데이터 Excel/CSV/PDF

## Build 10 확인 포인트

1. 데스크톱 우측 패널이 조회/표시/관리/설정 4탭으로 나뉘는지
2. 모바일 햄버거 메뉴가 같은 4분류로 정리되는지
3. DB 배포 필요 배지를 눌러 상세 경고가 다시 열리는지
4. DXF 레이어 체크를 바꿔도 목록 스크롤이 유지되는지
5. 모두 표시/숨김/반전/추천이 정상 동작하는지
6. DXF 선/문자 등을 클릭했을 때 레이어가 표시되는지
7. 선택한 레이어의 단독 보기 및 가져오기 제외가 정상인지
8. 창의관 실제 DXF에서 Zoom/Pan/레이어/영역 선택이 유지되는지

`latest-db.json`에는 실제 시설 데이터가 아니라 공식 FACDB의 `databaseId + revision` 기준만 둡니다.
