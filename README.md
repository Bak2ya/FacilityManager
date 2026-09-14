# FacilityManager

완성된 건축/공간 도면을 중심으로 학교 시설정보를 조회·관리하는 웹앱입니다.

현재 버전: **v0.13.1 · Build 15**

## 바로 실행

- ▶ **[FacilityManager 바로 실행](https://bak2ya.github.io/FacilityManager/)**
- **[FacilityManager GitHub](https://github.com/Bak2ya/FacilityManager)**
- ▶ **[PieniPlan 바로 실행](https://bak2ya.github.io/PieniPlan/)**
- **[PieniPlan GitHub](https://github.com/Bak2ya/PieniPlan)**

> PieniPlan은 도면 제작·편집·트레이싱·공간 구조 정의를 담당하는 별도 프로젝트입니다.

## 역할 분리

- **FacilityManager**: 완성 도면 조회, 호실/부서/배정, 출입·잠금, 소방·설비, 공사 이력, FACDB 운영
- **PieniPlan**: DXF/PDF/이미지 기반 도면 제작, 트레이싱, 도면 편집, 벽·문·창문·공간 정의, FACMAP 출력

FacilityManager는 PieniPlan이 내보낸 `.facmap`을 기존 공간과 비교하여 **바뀐 구조만 갱신하고 시설관리 업무 데이터는 유지**합니다.

## Build 15 작업 화면

FacilityManager는 도면을 최대한 크게 보기 위해 상시 앱 헤더를 없앴습니다.

- 화면 위 중앙 `건물명 · 층`에서 같은 건물의 층을 빠르게 변경
- 검색 / 출력 / 잠금정보는 도면 위 floating icon controls
- 오른쪽 정보 패널은 완전히 접을 수 있음
- 패널을 닫은 채 공간을 선택하면 바로 옆에 빠른 정보 표시
- 패널이 열려 있으면 공간 선택 시 자동으로 `조회` 탭에서 상세 정보 표시
- 모바일과 데스크톱이 같은 선택/조회 원리를 사용

## 데이터 원칙

- 실제 시설 데이터는 FACDB로 기기 로컬에서 사용
- GitHub Pages에는 앱 코드와 공개 가능한 기준정보만 배포
- FACMAP에는 출입 비밀번호·담당자·공사 이력 같은 시설관리 민감정보를 넣지 않음

## 도움말 / 연락

앱의 `설정 → 정보`에서 GitHub, PieniPlan, 개발자 연락 기능을 확인할 수 있습니다.

개발자 연락: **creative2ya@gmail.com**

교환 규격은 `FACMAP_SPEC_v0.1.0.md`를 참고하세요.
