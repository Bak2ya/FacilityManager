# 학교별 FacilityManager 설치·운영 가이드

이 문서는 다른 학교의 시설관리자가 FacilityManager를 자기 학교용 GitHub Pages로 설치하고 운영할 때의 기본 절차를 설명합니다.

## 1. 운영 구조

```text
학교 GitHub Pages
  └─ FacilityManager 프로그램 코드
       ├─ index.html
       ├─ drawing-studio.js
       ├─ workers/
       ├─ site-config.json
       └─ latest-db.json

학교 내부 배포
  └─ FacilityData.facdb
       └─ 실제 시설 데이터
```

핵심 원칙은 **프로그램과 데이터를 분리**하는 것입니다.

- 프로그램 업데이트: GitHub Pages 파일 교체
- 데이터 업데이트: FACDB 내부 배포
- GitHub에는 실제 시설 DB를 올리지 않음

## 2. GitHub 저장소 만들기

1. 학교 또는 담당자 GitHub 계정에서 새 저장소를 만듭니다.
2. FacilityManager GitHub Pages 배포 ZIP의 내용물을 저장소 루트에 업로드합니다.
3. 저장소의 GitHub Pages 기능을 활성화합니다.
4. 생성된 HTTPS 주소에 접속해 앱이 열리는지 확인합니다.

GitHub Pages 주소를 외부에 적극적으로 공유할 필요는 없습니다. 다만 **주소를 숨기는 것은 보안 기능이 아닙니다.** 기본 배포본은 검색 색인을 요청하지 않지만, URL을 아는 사용자의 접근 자체를 막지는 않습니다.

## 3. 학교 데이터 연결

1. 학교 내부에서 배포받은 FACDB를 준비합니다.
2. 앱에서 `DB 불러오기`를 누릅니다.
3. FACDB를 선택합니다.
4. 이후 해당 브라우저의 로컬 저장소에서 자동으로 다시 엽니다.

브라우저 저장소는 편의를 위한 작업 사본입니다. 원본 FACDB 파일은 학교 내부 기준 위치에 별도로 보관합니다.

## 4. 관리자 역할

- 일반 관리자: 시설정보/도면 등 일반 시설관리 데이터 수정
- 시스템 관리자: 일반 관리자 권한 + 관리자 계정 관리 + DB 배포 관리

시스템 관리자는 앱의 `시스템 관리`에서 배포 담당자 이메일과 공식 최신 DB 상태를 관리합니다.

## 5. DB를 수정한 뒤

데스크톱에서 관리자가 데이터를 저장하면 앱이 FACDB 재배포 필요 안내를 표시합니다.

권장 흐름:
1. 변경사항 저장
2. FACDB 내보내기
3. 학교 내부 사용자에게 FACDB 공유
4. 시스템 관리자가 `latest-db.json` 생성
5. GitHub의 `latest-db.json` 교체

`latest-db.json`에는 호실명, 잠금정보 등 실제 시설 데이터가 들어가지 않습니다.

## 6. 사용자의 DB 최신 여부

각 사용자의 브라우저는 자기 FACDB revision과 GitHub의 공식 revision을 비교합니다.

- 같음: 최신
- 사용자 DB가 낮음: 새 DB 있음
- 사용자 DB가 높음: 아직 공식 배포로 등록되지 않은 변경본

인터넷 연결이 없거나 `latest-db.json`을 읽을 수 없을 때는 최신 여부를 단정하지 않습니다.

## 7. 학교별 공개 설정

`site-config.json`은 공개 가능한 설정만 넣습니다.

예:
```json
{
  "schemaVersion": 1,
  "productName": "시설관리",
  "productEnglishName": "FacilityManager",
  "developerName": "Bak2ya",
  "developerContactUrl": "https://github.com/Bak2ya",
  "projectUrl": "https://github.com/Bak2ya/FacilityManager",
  "deploymentModel": "public-app-local-facdb"
}
```

개발자 연락 경로를 유지하면 학교 담당자가 프로그램 문제를 원 개발자에게 전달할 수 있습니다.

## 8. 프로그램 업데이트

새 FacilityManager 버전으로 업데이트할 때 실제 FACDB는 건드리지 않습니다.

학교별로 유지해야 할 파일:
- `site-config.json`
- 운영 중인 `latest-db.json`
- 학교 내부에서 별도로 관리하는 FACDB

업데이트 패키지 적용 전에는 기존 저장소를 백업하거나 Git commit으로 복구 지점을 남기는 것을 권장합니다.

## 9. 보안 체크리스트

- [ ] 실제 FACDB가 GitHub 저장소에 없음
- [ ] 운영 암호/암호화 키가 GitHub에 없음
- [ ] `latest-db.json`에 revision 외 민감정보가 없음
- [ ] `site-config.json`에 공개 가능한 정보만 있음
- [ ] 사용자에게 FACDB가 학교 내부 절차로 배포됨
- [ ] DB 수정 후 최신 FACDB 재배포 절차가 정해져 있음

## 10. 라이선스

다른 기관에 정식으로 공개·재배포하기 전에는 프로젝트의 오픈소스 라이선스를 별도로 확정해야 합니다. 현재 Build 11에서는 임의로 라이선스를 선택하지 않습니다.

## 11. 도면 작업 권장 조작

Drawing Studio와 DXF 가져오기 화면은 데스크톱 사용을 기준으로 합니다.

- 휠: 확대·축소
- 가운데 버튼 드래그: 이동
- Space + 드래그: 이동
- F: 전체 도면 맞춤
- +/-: 확대·축소
- Cmd/Ctrl+S: 저장
- Cmd/Ctrl+Z: 실행 취소
- Cmd/Ctrl+Shift+Z: 다시 실행
- Esc: 작업 취소/선택 해제
- Delete/Backspace: 선택 항목 삭제

조작 방식은 `기본 / CAD형 / 트랙패드형`으로 바꿀 수 있으며 해당 설정은 각 기기의 브라우저에만 저장됩니다.

DXF 문자가 전체 보기에서 겹치는 경우 `문자 자동`을 유지하면 확대 수준에 따라 표시량을 자동 조절합니다.


## 대형 DXF 성능
Build 11부터 대형 DXF 기준도는 Canvas 렌더러를 사용합니다. 시설관리자가 사용하는 원본 DXF가 수만 개 요소를 포함하더라도 브라우저 DOM에 요소별 노드를 생성하지 않도록 설계되어 있습니다.
