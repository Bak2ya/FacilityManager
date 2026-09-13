# FacilityManager v0.9.0 · Build 9 — GitHub Pages 배포

## 업로드

`FacilityManager_v0.9.0_Build9_GITHUB_PAGES.zip`의 **내용물 전체**를 GitHub Pages 저장소 루트에 올립니다.

필수 실행 파일:
- `index.html`
- `drawing-studio.js`
- `workers/dxf-worker.js`
- `manifest.webmanifest`
- `icons/`
- `site-config.json`
- `latest-db.json`
- `robots.txt`

`index.html`만 올리면 Drawing Studio / DXF Worker가 동작하지 않습니다.

## Build 9 확인 포인트

Build 9는 도면 작업 UI와 DXF 미리보기 수정이 중심입니다.
- DXF 선/폴리라인 표시 수정
- DXF Wheel Zoom / Pan
- 문자 LOD 자동 표시
- 기본/CAD형/트랙패드형 조작 설정
- 도면 조작 단축키/우클릭 메뉴
- 현재 도면 초기화

브라우저가 기존 파일을 캐시했다면 강력 새로고침 후 확인합니다.

## 운영 파일 주의

학교에서 이미 `site-config.json`과 `latest-db.json`을 실제 운영 값으로 사용 중이라면 새 패키지 업로드 때 무심코 예제 파일로 덮어쓰지 않도록 주의합니다.

FACDB는 GitHub에 업로드하지 않습니다.

## latest-db.json

`latest-db.json`에는 공식 배포 DB의 `databaseId + revision`과 공개 가능한 기준 정보만 둡니다. FACDB 배포 후 시스템 관리자가 생성한 파일로 교체합니다.

## 검색 노출

기본 배포본은 `noindex`와 `robots.txt`를 포함합니다. 이는 검색 색인을 줄이는 요청이며 접근 인증 기능은 아닙니다.
