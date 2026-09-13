# FacilityManager

도면을 중심으로 학교 시설정보를 조회·관리하는 웹앱입니다.

현재 버전: **v0.12.1 · Build 13**

## 바로 실행

- ▶ **[FacilityManager 바로 실행](https://bak2ya.github.io/FacilityManager/)**
- **[FacilityManager GitHub](https://github.com/Bak2ya/FacilityManager)**
- ▶ **[PieniPlan 바로 실행](https://bak2ya.github.io/PieniPlan/)**
- **[PieniPlan GitHub](https://github.com/Bak2ya/PieniPlan)**

> PieniPlan은 별도 프로젝트로 개발 중입니다. GitHub Pages가 활성화되기 전에는 실행 링크가 열리지 않을 수 있습니다.

## 제품 역할

FacilityManager는 **완성된 건축/공간 도면 위에서 시설관리 업무 데이터를 운영하는 도구**입니다.

- **FacilityManager**: 완성 도면 조회, 공간별 시설관리 정보, 설비·소방·출입·공사 이력, FACDB 운영
- **PieniPlan**: DXF/PDF/이미지 기반 도면 제작, 트레이싱, 도면 편집, 벽·문·창문·공간 정의

FacilityManager는 PieniPlan이 내보낸 `.facmap`을 받아 기존 공간과 비교하고 **바뀐 구조만 갱신하면서 시설관리 업무 데이터는 유지**합니다.

## 데이터 원칙

- 실제 시설 데이터는 FACDB로 기기 로컬에서 사용
- GitHub Pages에는 앱 코드와 공개 가능한 기준정보만 배포
- FACMAP은 도면 구조 교환용이며 출입 비밀번호·담당자·공사 이력 등 민감한 시설관리 데이터는 포함하지 않음

## v0.12.1 · Build 13

- 도면 제작 도구의 정식 이름을 **PieniPlan**으로 반영
- FacilityManager의 도면 제작 도구 링크를 PieniPlan 하나로 정리
- PieniPlan GitHub Pages 주소를 기본 연결값으로 등록
- GitHub 저장소 첫 화면용 README 추가/정리
- FacilityManager와 PieniPlan의 바로 실행 링크 제공
- FACMAP 문서와 샘플의 제작 도구 이름을 PieniPlan으로 통일

교환 규격은 `FACMAP_SPEC_v0.1.0.md`를 참고하세요.
