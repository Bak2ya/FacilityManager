# FacilityManager v0.12.1 · Build 13 — GitHub Pages 배포

## 업로드

`FacilityManager_v0.12.1_Build13_GITHUB_PAGES.zip`의 내용물을 저장소 루트에 올립니다.

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

`site-config.json`에는 다음 연결값이 들어 있습니다.

```json
{
  "pieniPlanUrl": "https://bak2ya.github.io/PieniPlan/"
}
```

PieniPlan GitHub Pages가 아직 준비되지 않은 동안에는 링크가 404를 표시할 수 있습니다. Pages 배포 후에는 FacilityManager에서 같은 주소를 그대로 사용할 수 있습니다.

## 데이터

실제 `*.facdb`는 GitHub에 올리지 않습니다. 각 기기에서 `DB 불러오기`로 연결합니다.

FACMAP은 도면 구조 전달용 파일입니다. 학교가 실제 도면 자체를 공개하면 안 되는 환경이라면 FACMAP 역시 내부에서 전달하고 GitHub 저장소에 올리지 않습니다.

## Build 13 확인 포인트

1. 기존 FACDB가 정상적으로 열리는지
2. 호실/공간 조회와 시설정보 수정이 정상인지
3. 샘플 FACMAP 가져오기에서 변경사항 비교가 표시되는지
4. FACMAP 적용 후 시설관리 데이터가 유지되는지
5. `PieniPlan 열기`가 새 탭에서 `https://bak2ya.github.io/PieniPlan/`을 여는지
6. 모바일 메뉴에서도 PieniPlan 링크가 동일하게 동작하는지

## 업데이트 주의

기관별 `site-config.json`과 운영 중인 `latest-db.json`은 기관 설정 파일입니다. 앱 업데이트 시 기관 값을 확인한 뒤 교체하세요.
