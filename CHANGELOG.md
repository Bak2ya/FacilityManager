# CHANGELOG

## v0.12.1 · Build 13
- 도면 제작 프로젝트 정식 이름을 **PieniPlan**으로 반영
- FacilityManager의 도면 제작 외부 링크를 PieniPlan 하나로 단순화
- PieniPlan GitHub Pages/저장소 링크 연결
- README에 FacilityManager와 PieniPlan 바로 실행 링크 추가
- FACMAP 규격/샘플 제작 도구 이름을 PieniPlan으로 통일

## v0.12.0 · Build 12
- FacilityManager와 도면 제작(PieniPlan)의 제품 책임 분리
- Drawing Studio/DXF Import/트레이싱을 FacilityManager 사용자 흐름에서 제거
- 관리 탭을 `완성 도면 가져오기 (.facmap)` 중심으로 변경
- FACMAP v0.1.0 교환 규격 및 `facmap-core.js` 추가
- 공간 고유 ID 우선 + 고유 호실번호 보조 매칭
- FACMAP 가져오기 전 변경/신규/사라짐/동일 비교 화면 추가
- 도면 구조 갱신 시 부서·출입·소방·설비·공사 이력 등 시설관리 데이터 보존
- 사라진 공간은 삭제하지 않고 지도에서 숨기는 안전한 처리
- PieniPlan 연결 설정과 DWG → DXF 링크 추가

## v0.11.0 · Build 11
- 대형 DXF 기준도를 Canvas/Path2D로 렌더링하여 Drawing Studio 성능 개선
- Pan/Zoom 중 SVG DOM 전체 재생성 제거
- DXF Import 미리보기 Canvas 가속
- 공간 인덱스를 이용한 DXF 객체 선택 최적화
- 선택 객체에서 `이 레이어 끄기` 추가

## v0.10.0 · Build 10

- 데스크톱/모바일 정보 구조를 조회/표시/관리/설정 4분류로 통합
- 우측 패널 Finder-style 탭 및 모바일 접기형 메뉴 적용
- 호실번호/호실명/관리부서/면적/글자 크기 표시 설정 추가
- 관리 화면의 도면 진입점을 `도면 편집` 하나로 단순화
- 하단 고정 DB 배포 상태 제거, 상단 배포 배지 클릭 상세화
- DXF 레이어 스크롤 튐 수정
- 레이어 검색/모두 표시/숨김/반전/추천/단독 보기 추가
- DXF 객체 클릭/근접 클릭으로 종류·레이어 확인 및 가져오기 제외
- Drawing Studio 종료 시 DXF Worker 정리

## v0.9.0 · Build 9
- DXF 미리보기의 잘못된 CSS 변수로 인해 선이 보이지 않던 문제 수정.
- DXF 전체화면 작업공간에 Wheel Zoom, 가운데 버튼/Space Drag Pan, F 전체 맞춤 추가.
- DXF 문자 표시 `자동 / 숨김 / 모두 표시` 및 확대 수준 기반 LOD 추가.
- Drawing Studio에 `기본 / CAD형 / 트랙패드형` 조작 프리셋 추가.
- F, +/- , Cmd/Ctrl+S, Undo/Redo, Esc, Delete/Backspace 등 도면 단축키 정리.
- Drawing Studio 우클릭 상황 메뉴 및 조작 도움말 추가.
- 도면 관리에 안전한 `현재 도면 초기화` 추가. 호실 정보/공간 경계/시설 데이터는 유지.
- 실제 `7.혜전 창의관.dxf` 회귀 분석: 37,211개 표시 요소, 67개 레이어, 1,016개 INSERT/BLOCK, 240개 원거리 요소.

## v0.8.0 · Build 8
- 모바일 `홈 화면에 추가` 지원/안내.
- DB 저장 후 FACDB 재배포 경고 및 배포 이메일 초안.
- `databaseId + revision` 기반 최신 DB 비교.
- `latest-db.json` 생성/확인용 시스템 관리 기능.
- `site-config.json`, `robots.txt`, noindex 기반 학교별 GitHub Pages 배포 구조.
- 개발자 연락/정보 화면.
- Save 시 실제 변경이 있을 때만 revision 증가하도록 수정.

## v0.7.0 · Build 7
- 모바일 Canvas-first Viewer 및 자동/모바일/데스크톱 레이아웃.
- 전체화면 Drawing Studio와 DXF Import Workspace.
- DXF Worker, BLOCK/INSERT, robust fit, 자동 영역 후보.

## v0.6.0 · Build 6
- 건물 추가 및 다층 DXF 가져오기 흐름.
- 단위/치수 보정, 회전, 레이어 선택.
