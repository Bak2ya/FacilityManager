# FacilityManager v0.8.0 · Build 8 — GitHub Pages 배포

## 업로드

이 ZIP의 **내용물 전체**를 GitHub Pages 저장소 루트에 올립니다.

필수 파일:
- `index.html`
- `drawing-studio.js`
- `workers/dxf-worker.js`
- `manifest.webmanifest`
- `icons/`
- `site-config.json`
- `latest-db.json`
- `robots.txt`

`index.html`만 단독 업로드하면 도면 편집/DXF 기능이 정상 동작하지 않습니다.

## 절대로 업로드하지 않을 파일

- 실제 `*.facdb`
- 시설/호실/잠금정보가 담긴 Excel, CSV, JSON
- 운영 암호/키

FACDB는 각 학교가 내부에서 별도로 배포하고, 각 기기에서 직접 불러옵니다.

## latest-db.json

`latest-db.json`은 실제 시설 데이터가 아니라 **공식 배포 DB의 식별자와 revision만** 담습니다.

시스템 관리자 → `시스템 관리` → `latest-db.json 생성`으로 현재 DB 기준 파일을 만들 수 있습니다.

권장 순서:
1. 시설 데이터를 수정하고 저장
2. FACDB 내보내기
3. 내부 사용자에게 FACDB 배포
4. 시스템 관리에서 `latest-db.json` 생성
5. GitHub Pages 저장소의 `latest-db.json` 교체

## site-config.json

공개되어도 되는 설치별 정보만 기록합니다.

기본 항목:
- 제품명
- 개발자 이름
- 개발자 연락 URL
- 프로젝트 URL(선택)

실제 시설 데이터나 내부 암호는 넣지 않습니다.

## 검색 노출

기본 배포본은 HTML `noindex`와 `robots.txt`를 포함합니다. 이는 검색엔진 색인을 줄이기 위한 요청일 뿐 **주소 접근을 차단하는 인증 기능은 아닙니다.**

표준 공개 GitHub Pages를 사용하는 경우 URL을 아는 사용자는 페이지 자체를 열 수 있으므로, 페이지에 실제 시설 데이터를 포함하지 않는 구조를 유지해야 합니다.
