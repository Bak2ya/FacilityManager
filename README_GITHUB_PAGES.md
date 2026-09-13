# FacilityManager v0.11.0 · Build 11 — GitHub Pages 배포

## 업로드
`FacilityManager_v0.11.0_Build11_GITHUB_PAGES.zip`의 내용물 전체를 저장소 루트에 올립니다.

GitHub Pages 설정:
- Source: Deploy from a branch
- Branch: main
- Folder: /(root)
- HTTPS 사용

## 데이터
실제 `*.facdb`는 GitHub에 올리지 않습니다. 각 기기에서 `DB 불러오기`로 연결합니다.

## Build 11 확인 포인트
1. `7.혜전 창의관.dxf` 같은 대형 DXF 가져오기
2. Drawing Studio에서 이동/확대/클릭 반응성
3. DXF Import에서 레이어 Hover/단독 보기와 객체 선택
4. 객체 선택 후 `이 레이어 끄기` 동작

## 업데이트 주의
기관별 `site-config.json`과 운영 중인 `latest-db.json`은 기관 설정 파일입니다. 정식 배포형 운영에서는 앱 업데이트 시 기관 값을 확인한 뒤 교체하세요.
