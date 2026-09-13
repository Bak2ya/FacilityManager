# FACMAP v0.1.0 — PieniPlan ↔ FacilityManager 교환 규격

## 목적
FACMAP은 **도면 제작 도구(PieniPlan)** 와 **시설관리(FacilityManager)** 의 책임을 분리하기 위한 단일 층 도면 교환 형식이다.

- PieniPlan: DXF/PDF/이미지 기반 도면 제작, 트레이싱, 벽·문·창문·공간 정의, 공간 고유 ID 유지
- FacilityManager: 완성된 공간 구조를 받아 기존 시설관리 데이터와 비교·연결하고 업무 데이터를 관리
- FACMAP은 시설관리 암호, 출입 비밀번호, 담당자 기록, 공사 이력 같은 FACDB 업무 데이터를 포함하지 않는다.

## 파일 형식
초기 규격은 외부 라이브러리 없이 브라우저에서 읽을 수 있도록 **UTF-8 JSON 단일 파일**을 사용한다.
확장자: `.facmap`

```json
{
  "format": "FACMAP",
  "version": "0.1.0",
  "createdAt": "2026-09-13T00:00:00.000Z",
  "sourceApp": {
    "name": "PieniPlan",
    "version": "0.1.0"
  },
  "map": {
    "id": "map-buildingA-1f",
    "revision": "1",
    "building": {
      "code": "A",
      "name": "창의관"
    },
    "floor": {
      "label": "1층",
      "name": "창의관 1층"
    },
    "canvas": {
      "width": 1100,
      "height": 700
    },
    "drawing": {
      "buildingOutline": [],
      "zones": [],
      "doors": [],
      "windows": [],
      "objects": [],
      "cadReference": null
    },
    "spaces": [
      {
        "id": "space-uuid-stable-001",
        "spaceType": "room",
        "roomNo": "101",
        "name": "101호",
        "areaM2": 42.15,
        "geometry": [[100,100],[240,100],[240,220],[100,220]]
      }
    ]
  }
}
```

## 공간 ID 규칙
`spaces[].id`는 **도형이 조금 수정되어도 유지되는 안정적인 고유 ID**여야 한다.

- 같은 공간의 벽 위치가 조정됨 → 같은 ID 유지
- 새 공간 생성 → 새 ID
- 공간 삭제 → 다음 FACMAP에서 해당 ID가 사라짐
- 공간 분할 → 기존 공간을 유지할지 새 공간으로 볼지는 PieniPlan에서 사용자가 확정하고 ID를 배정
- 공간 병합 → 어떤 기존 ID를 계승할지 PieniPlan에서 사용자가 확정

FacilityManager는 이 ID를 `room.mapSpaceId`로 저장한다.
기존 FACDB와 처음 연결할 때 ID가 없으면 **중복되지 않는 호실번호**를 보조 매칭에 사용할 수 있다.

## 책임 경계
### PieniPlan가 소유하는 데이터
- 공간 ID
- 공간 경계 `geometry`
- 공간 종류 `spaceType`
- 호실번호 `roomNo` (선택이지만 권장)
- 공간 이름 `name` (선택)
- 도면 기준 면적 `areaM2`
- 건축/도면 요소: 외곽선, 구역, 문, 창문, 기본 도면 기호, CAD 기준선

### FacilityManager가 소유하는 데이터
- 용도
- 관리부서
- 배정/담당
- 출입/잠금 정보
- 소방·방재 관리 데이터
- 설비/기자재 관리 데이터
- 공사 이력
- 비고 및 시설관리 운영 기록

FACMAP 갱신 시 FacilityManager는 **도면 소유 필드만 갱신하고 업무 필드는 보존**한다.

## FacilityManager 적용 규칙 (v0.12.1 · Build 13 기준)
1. 공간은 `mapSpaceId` 우선 매칭
2. 최초 연결은 고유한 `roomNo`가 같으면 보조 매칭
3. 경계/호실번호/면적/공간종류가 바뀐 공간만 변경으로 표시
4. 신규 공간은 새 FacilityManager room으로 생성
5. 새 도면에서 사라진 공간은 자동 삭제하지 않고 `mapMissing=true`로 보존하며 지도에서 숨김
6. 시설관리 업무 데이터는 변경하지 않음
7. 도면 자체의 문·창문·기호·기준선은 새 FACMAP의 내용으로 교체
8. FacilityManager의 설비 `equipment`는 도면 교체 시 유지

## 향후 확장
v0.1.0은 단일 층 JSON 교환을 우선한다. 필요해지면 이후 버전에서 다음을 검토한다.
- 여러 층 묶음 패키지
- 원본 PDF/이미지 또는 preview 포함 ZIP 컨테이너
- geometry checksum / revision lineage
- 공간 분할·병합 관계 메타데이터
- 자동 변경 충돌 해결 정보

형식 확장은 `version`을 올리고 기존 v0.1.0 읽기 호환을 유지한다.
