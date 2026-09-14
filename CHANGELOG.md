# CHANGELOG

## v0.13.3 · Build 17
- 시설 데이터 연결 전에는 연결 카드만 표시하고 도면용 floating controls 숨김
- iPhone/iPad에서 `.facdb` 파일이 비활성화되지 않도록 파일 선택기 확장자 제한 제거 + FileReader fallback 추가
- 모바일 패널 열림 시 다른 floating tools를 숨기고 `>` 손잡이만 패널 왼쪽 경계에 유지
- 위치 island 글씨를 14px로 키우고 건물명/층 길이에 따라 폭이 자연스럽게 변하도록 개선
- 왼쪽 아래 확대/축소/홈 control group 제거
- `전체 보기`를 fit-to-screen 아이콘으로 검색/출력/잠금/패널 control family에 통합
- `표시 → 도면 배율` 슬라이더 추가, 휠/핀치/슬라이더 확대율 동기화


## v0.13.2 · Build 16

- 설정 → 데이터에 `오프라인 사용` 상태/준비 기능을 추가했습니다.
- 앱 파일은 사용자가 직접 준비할 때 Cache Storage에 저장하고, 시설 데이터는 기존 IndexedDB 구조를 그대로 사용합니다.
- 상태는 `앱 파일 준비됨 / 시설 데이터 준비됨`처럼 저장 위치보다 사용 준비 여부를 중심으로 표현합니다.
- 브라우저가 사이트 데이터·캐시·저장 공간을 삭제하면 오프라인 준비가 해제될 수 있음을 안내합니다.
- `최신 DB 확인`을 `최신 여부 확인`으로 바꾸고 데이터 최신 여부임을 명확히 했습니다.
- `DB 불러오기 / FACDB 내보내기`를 `데이터 불러오기 / 데이터 내보내기`로 통일했습니다.
- Build 14/15 배포 ZIP에서 빠졌던 manifest, icons, facmap-core, site-config 등 정적 배포 자산을 복구했습니다.
- `latest-db.json`은 오프라인 캐시 대상에서 제외해, 네트워크가 없을 때 최신 여부를 아는 것처럼 표시하지 않습니다.

## v0.13.1 · Build 15

- Build 14에서 구 UI와 새 canvas-first UI가 동시에 레이아웃에 참여하던 충돌을 수정했습니다.
- 앱 작업영역을 브라우저 viewport 전체에 고정하고, 패널이 열리거나 닫힐 때 남는 빈 영역을 제거했습니다.
- 기존 상단 헤더, 위치/배율 배지, 전체보기 텍스트 버튼, 하단 조작 안내가 화면에 다시 나타나지 않도록 레거시 UI를 완전히 비표시 처리했습니다.
- 검색·출력·잠금 아이콘과 정보 패널 여닫기 버튼을 같은 높이의 floating control family로 통합했습니다.
- 패널 버튼은 화면/패널 경계에 붙는 반쪽 캡슐 형태를 유지하며, 닫힘 상태 `<`, 열림 상태 `>` 방향을 표시합니다.
- 현재 건물·층 표시를 Dynamic Island형 층 선택기로 개선했습니다. 폭은 유지하고 같은 건물의 층 수만큼 아래로 확장되며, 많은 층은 내부 스크롤됩니다.
- 현재 층은 확장 목록에서 강조되고 선택 후 island가 다시 접힙니다.
- 모바일과 데스크톱에서 같은 패널/Popover/층 선택 상호작용 규칙을 유지합니다.

## v0.13.0 · Build 14
- 캔버스 우선 전체 UI 재구성: 상시 앱 헤더 제거
- 상단 중앙 위치 pill + 같은 건물 층 빠른 전환
- 검색/출력/잠금 floating icon controls
- 관리자 인증/저장을 관리 탭으로 이동
- 오른쪽 패널 완전 접기 + edge handle
- 패널 닫힘 시 공간 빠른 Popover, 열림 시 자동 조회 탭
- 모바일/데스크톱 동일 공간 선택 원리
- 휠 Zoom 감도 완화 + 일시적 확대율 HUD
- 즐겨찾기 안내 추가, 정보 화면에 GitHub/PieniPlan/개발자 연락 통합
- 개발자 연락: creative2ya@gmail.com

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
