# doro-svg 인계 안내 (에이전트용)

**이 프로젝트는?** doro 캐릭터를 **SVG만으로** 그려 Codex 펫(Pets v2 스프라이트 시트)으로 만든 작업입니다. 이미지 생성 도구는 쓰지 않습니다.

**현재 상태 (2026-10-06)**
- 눈·앞머리 겹침, 눈 뒤 얼굴 바탕, 키보드 세 줄 타건 피드백을 반영했습니다.
- 원본 검증 6종, 공개 패키지 3인 방향 검수, 독립 재현과 시험 설치가 통과했습니다.
- `~/.codex/pets/doro/`에 설치했습니다.
- 공개 저장소: `https://github.com/godxxy1229/doro-codex-pet`
- 공개 패키지: codex-pets `doro-svg`. 로컬 `doro`의 설명·선택 상태를 보존하고 시트만 갱신합니다.

상세 규격·리그·연출 설명은 [docs/BUILD.ko.md](docs/BUILD.ko.md)에 있습니다. 영어 빌드 안내는 [docs/BUILD.md](docs/BUILD.md)입니다. 이 문서는 "어디부터 보고, 어떻게 고치고, 무엇을 지켜야 하는지"만 정리합니다.

## 1. 먼저 읽을 파일 (순서대로)

1. [docs/BUILD.ko.md](docs/BUILD.ko.md): 규격(1536×2288, 8×11, 73프레임), 리그 구조, 상태별 연출, 알려진 한계
2. [src/poses.mjs](src/poses.mjs): **대부분의 수정은 여기서 합니다.**
   - `CELL`: 셀 배치
   - `PIVOTS`: 부위별 회전 기준점
   - `ROWS`: 행·프레임 수·시간
   - `STATES`: 상태별 포즈 함수
3. [tools/rig-parts.mjs](tools/rig-parts.mjs): 원본에 없는 추가 파츠를 정의합니다.
   - 보강 밑면, 눈물, 돋보기, 둥근 앞발, 키보드, 클립(`DEFS`)
4. [build.mjs](build.mjs): 리그 + 포즈 → 프레임 PNG → 아틀라스 PNG/WebP. 옆머리 밑면은 회전 방향을 보고 자동으로 켭니다.
5. [tools/optimize.mjs](tools/optimize.mjs): 원본 `source/doro.svg`를 [src/doro-rig.svg](src/doro-rig.svg)로 경량화하고, 추가 파츠를 끼워 넣습니다.
6. [tools/validate.sh](tools/validate.sh): 설치된 work-pets 검증 스크립트를 수정 없이 실행하고 프리뷰를 만듭니다.

## 2. 폴더 구조

| 경로 | 종류 | 설명 |
|---|---|---|
| `src/poses.mjs`, `tools/*.mjs`, `tools/*.py`, `tools/validate.sh`, `build.mjs` | **직접 수정** | 소스 |
| `src/doro-rig.svg` | 생성물 | `optimize.mjs`가 만듭니다. 직접 고치지 말고 `rig-parts.mjs`나 `optimize.mjs`를 고치세요 |
| `frames/<state>/NN.png` | 생성물 | 렌더된 셀(192×208) |
| `final/spritesheet.{png,webp}`, `final/validation.json` | 생성물 | 최종 아틀라스와 구조 검증 결과 |
| `qa/` | 생성물 | contact sheet, 방향 시트, 각종 리포트, `strips/<state>.png`(2배, 밝은·어두운 배경 검수용) |
| `previews/` | 생성물 | 상태별 GIF, all-states GIF·MP4, look-loop, 대표 프레임 |
| `package/pet.json`, `package/spritesheet.webp` | 배포본 | 공개 doro-svg 패키지; neutral 셀 추가, 영어 설명 |
| `build/`, `.scratch/`, `node_modules/` | 임시 | gitignore 대상 |

**외부 의존**
- 원본 그림: `source/doro.svg`, 원본 설명 `docs/ORIGINAL.ko.md`
- 검증 스크립트: `~/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet/scripts/`
- 미리보기 스크립트: `~/.codex/skills/hatch-pet/scripts/`
- 선례: `../clawd-svg/`(같은 방식으로 만든 Clawd 펫)

## 3. 수정 → 검증 → 설치 흐름

```bash
cd doro-svg
node tools/optimize.mjs        # 리그를 바꿨을 때만 (rig-parts.mjs / optimize.mjs 수정 시)
node build.mjs review          # 특정 상태만 빠르게 렌더 → qa/strips/review.png 확인
node build.mjs                 # 전체 렌더 + final/ 아틀라스
bash tools/validate.sh --gate  # 검증 6종 + 프리뷰 (모든 리포트 ok: true, 오류 0이어야 함)
npm run package:pet            # 공개 패키지 생성; row0 col6 neutral
```

**검증 범위**
- 확대 확인: `.scratch/`에 임시 스크립트를 만들어 프레임을 3~8배로 잘라 봅니다. 어두운 배경과 밝은 배경을 모두 봅니다.
- 자동 점검(관례): 전 프레임을 대상으로 두 가지를 셉니다.
  - 밑면이 배경에 닿는 픽셀: 프레임당 ≤4
  - 내부 구멍: ≤2px (running은 키보드와 몸 사이 빈 공간 제외)

**블라인드 방향 검수** (look 행 검증, 아틀라스가 바뀌면 매번)
1. `make_direction_blind_qa_sheet.py`로 시트를 만듭니다. **정답 키는 스크래치패드 등 프로젝트 밖에** 둡니다.
2. 시트를 4조각으로 잘라 `build/blind/`에 둡니다.
3. 서로 격리된 검수 서브에이전트 3명에게 조각 이미지만 보여 주고 각 축을 판정하게 합니다(screen-left/right, up/down).
4. `combine_direction_blind_verdicts.py`로 합친 뒤 `validate_direction_blind_verdicts.py`로 정답 키와 비교합니다. 결과는 `qa/blind-*.json`입니다.
5. 끝나면 정답 키를 `qa/`로 복사합니다.

**설치**
1. `npm run package:pet`으로 공개 `doro-svg` 패키지를 생성합니다.
2. 공개 WebP는 row0 col6에 첫 Idle 셀을 추가합니다. 73개 동작 셀은 `final/`과 픽셀 단위로 같아야 합니다.
3. 공개 설치는 `~/.codex/pets/doro-svg/`를 사용합니다. 기존 `doro`의 manifest와 선택 상태는 유지하고, 사용자가 로컬 반영을 요청하면 시트만 교체합니다.
4. `optimize → build`를 독립 폴더에서 다시 돌려 동일한 원본 아틀라스가 나오는지 확인합니다.

## 4. 사용자 연출 지침 (반드시 지킬 것)

사용자가 여러 차례 직접 정정한 내용입니다.

- **동작은 크게**: 프레임이 적으므로 크게 움직이고, 대신 리그를 보강해 틈을 막습니다.
- **눈은 감지 않음**: 깜빡임·감은 눈·`> <` 눈을 쓰지 않습니다. 울 때도 눈을 뜬 채 눈물을 흘립니다.
- **입은 항상 `:3`**: waiting·failed에서도 o 입·물결 입으로 바꾸지 않습니다.
- **다리 들기**: 앞다리는 기준점 회전만 씁니다. `ty`로 끌어올리면 발 아랫선이 꺾여 보입니다. waving·waiting은 실제 짧은 앞다리를 회전합니다.
- **review 손**: 몸통과 분리된 **둥근 앞발(벙어리장갑 + 엄지 주름)**이 손잡이를 감싸 쥡니다. 손잡이가 앞발 위아래로 보여야 합니다(사용자 참고 이미지 기준).
- **review 돋보기**: 원래의 약 1.6배(현재 반지름 43), 렌즈 속 확대 약 1.3~1.4배(현재 1.4)입니다. **렌즈 중심을 왼쪽 눈 중심에** 맞춥니다.
- **드러난 자리는 원래 재질로**: 옆머리가 젖혀질 때 드러나는 볼은 피부색으로 채웁니다(`fs*-under`). 머리카락 색 밑면이 외곽선 밖이나 볼로 새면 안 됩니다.
- **눈물은 얼굴 안에**: 시선 이동을 더해도 턱선 안에 머물러야 합니다.
- **도구 허용**: 동작 강조에 도구를 써도 됩니다(running=키보드, review=돋보기).

## 5. 함정과 주의

- **좌표계**: 리그는 **400×400 격자**입니다(원본 800의 절반). `docs/ORIGINAL.ko.md`의 기준점 값은 2로 나눠 씁니다.
- **파츠 켜고 끄기**: 추가 파츠는 `display="none"`으로 들어 있고, 포즈의 `show`/`hide` 목록으로 켜고 끕니다. id가 없으면 `build.mjs`가 오류를 냅니다.
- **옆머리 밑면**: `hs*-under`(머리카락), `fs*-under`(피부)는 포즈가 아니라 `build.mjs`가 옆머리 회전 부호를 보고 자동으로 켭니다.
- **running-right**: running-left를 프레임마다 좌우 반전한 것입니다. 그래서 이 행만 장미·리본이 반대쪽에 보입니다(알려진 한계).
- **렌즈 속 확대**: `<use href="#head">`를 `lens` 클립으로 자른 방식입니다. 돋보기를 돌릴 때는 `lens-view`를 반대로 돌려야 확대 영상이 어긋나지 않습니다.
- **svgo 정밀도**: 본체 경로는 정수로, 추가 파츠는 소수 첫째 자리로 반올림합니다. 작은 파츠를 정수로 반올림하면 모양이 뭉개집니다.
- **레이어 순서**: 다리는 머리 아래 레이어입니다. 머리 위에 보강 조각을 덧대면 홈·쐐기가 생기므로, 몸통 외곽선 보강은 몸통 그룹 안에서 합니다(`body-edge-fl`, `under-lines`).
- **검증 경고**: `look-continuity` 경고(다리 사이 빈 공간)와 running의 내부 구멍(키보드와 몸 사이)은 실제 빈 공간이라 허용합니다.
