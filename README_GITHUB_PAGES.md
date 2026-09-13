# FacilityManager v0.12.0 · Build 12 — GitHub Pages 배포

## 업로드
`FacilityManager_v0.12.0_Build12_GITHUB_PAGES.zip`의 내용물을 저장소 루트에 올립니다.

GitHub Pages 설정:
- Source: Deploy from a branch
- Branch: main
- Folder: /(root)
- HTTPS 사용

## 데이터
실제 `*.facdb`는 GitHub에 올리지 않습니다. 각 기기에서 `DB 불러오기`로 연결합니다.

FACMAP은 도면 구조 전달용 파일입니다. 학교가 실제 도면 자체를 공개하면 안 되는 환경이라면 FACMAP 역시 내부에서 전달하고 GitHub 저장소에 올리지 않습니다.

## WebDXF 연결
`site-config.json`의 아래 항목을 사용합니다.

```json
{
  "webDxfUrl": "",
  "dwg2dxfUrl": "https://bak2ya.github.io/DWGtoDXF/"
}
```

WebDXF 배포 주소가 확정되면 `webDxfUrl`만 채우면 FacilityManager의 버튼이 활성화됩니다.

## Build 12 확인 포인트
1. 기존 FACDB가 정상적으로 열리는지
2. 호실/공간 조회와 시설정보 수정이 정상인지
3. 샘플 FACMAP 가져오기에서 변경사항 비교가 표시되는지
4. FACMAP 적용 후 시설관리 데이터가 유지되는지
5. WebDXF 미연결 상태가 `준비 중`으로 안전하게 표시되는지
6. DWG → DXF 링크가 새 탭에서 열리는지

## 업데이트 주의
기관별 `site-config.json`과 운영 중인 `latest-db.json`은 기관 설정 파일입니다. 앱 업데이트 시 기관 값을 확인한 뒤 교체하세요.
