# FacilityManager

학교 시설관리 기준도를 중심으로 공간, 시건, 소방·방재, 설비, 공사이력 등을 조회·관리하기 위한 로컬 데이터 기반 웹앱입니다.

현재 버전: **v0.9.0 · Build 9**

## 데이터 보안 구조

GitHub Pages에는 프로그램 코드와 공개 가능한 설정/최신 DB 기준만 둡니다. 실제 시설 데이터는 각 학교가 내부에서 배포하는 FACDB에 저장하고 사용자의 브라우저에서 직접 불러옵니다.

> 실제 FACDB, 운영 암호, 잠금정보가 들어 있는 파일을 공개 GitHub 저장소에 업로드하지 마세요.

## Build 9

- DXF 선 표시 오류 수정
- 전체화면 DXF 작업공간의 Zoom/Pan
- 문자 자동 LOD 표시
- Drawing Studio 기본/CAD형/트랙패드형 조작 설정
- 도면 단축키 및 우클릭 메뉴
- 현재 도면 초기화

## 운영

- 앱: GitHub Pages
- 실제 시설 데이터: 학교 내부 FACDB
- 최신 DB 확인: `latest-db.json`의 `databaseId + revision`
- 모바일: 홈 화면 추가 지원/안내
- 관리자 도면 작업: 전체화면 Drawing Studio

자세한 설치 방법은 `SCHOOL_DEPLOYMENT_GUIDE.md`를 참고하세요.

개발자/프로젝트: https://github.com/Bak2ya/FacilityManager
