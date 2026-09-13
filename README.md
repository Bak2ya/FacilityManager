# FacilityManager

도면 중심 학교 시설관리 웹앱입니다.

현재 버전: **v0.11.0 · Build 11**

## 설계 원칙
- 일반 조회는 가볍게 유지
- 실제 시설 데이터는 FACDB로 기기 로컬에서 사용
- GitHub Pages에는 앱 코드와 공개 가능한 기준정보만 배포
- 도면 편집은 전체화면 Drawing Studio에서 수행
- 대형 DXF는 Canvas 정적 레이어, 편집 요소는 SVG 인터랙티브 레이어로 분리

## Build 11
대형 CAD/DXF가 Drawing Studio를 멈추게 하던 SVG DOM 병목을 Canvas/Path2D 렌더러로 교체했습니다. DXF Import 역시 같은 성능 원칙을 적용하며 객체 선택은 공간 인덱스를 사용합니다.

자세한 배포 방법은 `README_GITHUB_PAGES.md`, 기관 운영 방식은 `SCHOOL_DEPLOYMENT_GUIDE.md`를 참고하세요.
