const ko = Object.freeze({
  language: {
    label: "LANGUAGE",
    ariaLabel: "표시 언어 선택",
    listLabel: "언어 선택",
    options: {
      ja: "日本語",
      en: "English",
      zh: "中文",
      ko: "한국어",
    },
  },
  theme: {
    ariaLabel: "표시 모드 선택",
    options: {
      light: "라이트 모드",
      dark: "다크 모드",
    },
  },
  navigation: {
    label: "작업 섹션",
    project: "프로젝트",
    design: "디자인",
    export: "내보내기",
  },
  actions: {
    back: "돌아가기",
    close: "닫기",
    choose: "선택",
    copy: "복사",
    copied: "복사됨",
    on: "켜짐",
    off: "꺼짐",
    saving: "저장 중...",
  },
  dropOverlay: {
    title: "프로젝트 / JSON / 폰트 드롭",
    body: "프로젝트, 저장된 편집 데이터, 호환 입력 JSON 또는 TTF / OTF 폰트를 불러옵니다.",
    chip: "ZIP / JSON / TTF / OTF",
  },
  importReport: {
    title: "JSON 불러오기 리포트",
    unboundBody: "{fileName}의 파라미터 {count}개는 현재 형상에 적용할 수 없어 건너뛰었습니다.",
    unboundListLabel: "건너뛴 파라미터",
    expand: "JSON 불러오기 리포트 펼치기",
    collapse: "JSON 불러오기 리포트 접기",
    more: "{count}개 더",
    deleteParam: "JSON에서 {path} 삭제",
  },
  panels: {
    project: {
      title: "프로젝트",
      body: "여러 키캡을 함께 보관하고 목록에서 현재 편집 대상을 전환합니다.",
    },
    design: {
      title: "디자인",
      body: "선택한 키캡 형상과 각인을 입력에 맞춰 조정하고, 오른쪽 미리보기에 자동 반영할 수 있습니다.",
    },
    export: {
      title: "내보내기",
      body: "3MF / STEP / STL 인쇄 데이터와 나중에 편집을 다시 시작하기 위한 JSON을 저장할 수 있습니다.",
    },
  },
  mobileInspector: {
    hide: "디자인 카드를 위로 숨기기",
    show: "디자인 카드 되돌리기",
  },
  exportPanel: {
    copy: "복사",
    copyBase64: "Base64 복사",
    copyHint: "클립보드로 복사",
    jsonChip: "편집 재개용 JSON",
    jsonTitle: "편집 데이터 저장",
    jsonBody: "형상, 치수, 색상, 각인을 JSON으로 저장합니다. 나중에 드래그 앤 드롭으로 다시 불러올 수 있습니다.",
    saveJson: "JSON 저장",
    threeMfChip: "인쇄용 3MF",
    threeMfTitle: "3MF 데이터 저장",
    threeMfBody: "본체, 위치 표시, 각인을 포함한 인쇄용 데이터를 3MF 형식으로 묶어 저장합니다.",
    saveThreeMf: "3MF 저장",
    stepChip: "CAD 교환용 STEP",
    stepTitle: "STEP 저장",
    stepBody: "단일 형상을 STEP/AP214 faceted B-rep으로 저장합니다. 색상, 각인, 부품 분리는 포함하지 않습니다. CAD 전달이나 제작 요구사항에 STEP이 필요할 때 사용합니다.",
    saveStep: "STEP 저장",
    optionsTitle: "옵션",
    optionsBody: "일반 인쇄 데이터는 3MF를 권장합니다. CAD 전달에는 STEP, 단순 메시만 필요할 때는 STL을 사용합니다.",
    optionsExpand: "옵션 펼치기",
    optionsCollapse: "옵션 접기",
    stlChip: "단색용 STL",
    stlTitle: "STL 저장",
    stlBody: "단일 소재, 단일 메시 STL로 저장합니다. 색상과 각인은 무시되고 형상만 출력됩니다. 색상 구분이나 각인이 필요하면 3MF로 저장하세요.",
    saveStl: "STL 저장",
  },
  project: {
    saveJson: "프로젝트 JSON 저장",
    copyJson: "프로젝트 JSON 복사",
    importJson: "프로젝트 JSON 가져오기",
    importLabel: "프로젝트 JSON 붙여넣기",
    importPlaceholder: "여기에 프로젝트 JSON 파일 내용을 붙여넣으세요",
    importPaste: "클립보드에서 붙여넣기",
    importUpload: "파일 선택",
    importApply: "프로젝트 불러오기",
    importing: "프로젝트를 불러오는 중",
    importEmpty: "먼저 프로젝트 JSON을 붙여넣으세요.",
    importNotBundle: "KeycapMaker 프로젝트 JSON이 아닙니다.",
    importFailed: "프로젝트를 불러오지 못했습니다: {message}",
    savedJson: "프로젝트 JSON을 저장했습니다 ({byteLength}바이트)",
    copying: "프로젝트 JSON을 복사하는 중",
    copiedJson: "프로젝트 JSON을 클립보드에 복사했습니다 ({byteLength}바이트)",
    copyFailed: "프로젝트 JSON을 복사하지 못했습니다: {message}",
    pasted: "클립보드 내용을 붙여넣었습니다",
    pasteFailed: "클립보드를 읽지 못했습니다: {message}",
    templatesTitle: "키보드 템플릿",
    templatesHint: "현재 모양과 색상을 사용해 키마다 키캡 하나를 가진 프로젝트를 새로 만듭니다.",
    templateBuilding: "{name} 생성 중",
    templateProgress: "{name} 생성 중 ({done}/{total})",
    templateLoaded: "{name}을(를) 불러왔습니다 (키캡 {count}개)",
    templateFailed: "템플릿을 만들지 못했습니다: {message}",
    templateReplaceConfirm: "현재 프로젝트(키캡 {count}개)를 대체합니다. 계속할까요?",
    templates: {
      qwerty: "QWERTY (ANSI 104)",
      qwertz: "QWERTZ (ISO 105)",
    },
    nameTitle: "프로젝트 이름",
    nameLabel: "프로젝트 이름",
    nameHint: "ZIP 루트 디렉터리와 프로젝트 manifest 이름에 사용합니다",
    keycapsTitle: "키캡 목록",
    keycapsCount: "{count}개",
    empty: "아직 키캡이 없습니다.",
    addCurrent: "편집 중인 키캡 사본 추가",
    recapturePreview: "{name} 미리보기 다시 촬영",
    previewRecaptured: "미리보기를 다시 촬영했습니다",
    reorderKeycap: "{name} 표시 순서 변경",
    selectKeycap: "{name} 편집",
    activeKeycap: "편집 중",
    exportAction: "내보내기",
    exportKeycap: "{name} 내보내기",
    exportChip: "키캡 내보내기",
    exportTitle: "{name} 내보내기",
    designAction: "디자인",
    designKeycap: "{name} 디자인",
    designChip: "키캡 디자인",
    designTitle: "{name} 디자인",
    deleteChip: "삭제",
    deleteTitle: "키캡 삭제",
    deleteBody: "이 키캡을 프로젝트 목록에서 삭제합니다.",
    deleteLastBody: "프로젝트에는 키캡이 하나 이상 있어야 하므로 이 키캡은 삭제할 수 없습니다.",
    deleteAction: "삭제",
    save: "프로젝트 저장",
    edited: "프로젝트 편집 중",
    added: "{name}을 프로젝트에 추가했습니다",
    deleted: "{name}을 프로젝트에서 삭제했습니다",
    reordered: "키캡 목록 표시 순서를 변경했습니다",
    loadedKeycap: "{name}으로 전환했습니다",
    loaded: "프로젝트 {name}을 불러왔습니다({count}개)",
    saving: "프로젝트 저장 중",
    saved: "프로젝트를 저장했습니다",
    saveFailed: "프로젝트 저장 실패: {message}",
    directoryNotWritable: "이 디렉터리에 쓸 수 없습니다.",
    previewDecodeFailed: "미리보기 이미지를 저장 데이터로 변환할 수 없습니다.",
    invalidPath: "프로젝트 내부 경로가 잘못되었습니다: {path}",
    missingProjectFile: "프로젝트 내부 파일을 찾을 수 없습니다: {path}",
  },
  nameGroup: {
    title: "이름",
    description: "저장할 때 사용하는 이름입니다. 3MF, STEP, STL, 편집 데이터 JSON에 사용되며, 나중에 불러와도 이 이름이 유지됩니다.",
  },
  parameterGroupCaptions: {
    name: "내보내기 파일명",
    top: "상면과 기울기",
    topHat: "추가 키톱",
    legend: "문자와 위치",
  },
  unitBasis: {
    title: "1u 환산",
    description: "현재 {unitBase} mm를 1u로 표시합니다.",
    fieldLabel: "1u 기준",
    fieldHint: "좁은 피치 환산용입니다. 모델 치수는 바뀌지 않습니다",
    readout: "현재 치수: 폭 {widthUnits}u / 깊이 {depthUnits}u",
  },
  fieldGroup: {
    expand: "{title} 펼치기",
    collapse: "{title} 접기",
  },
  legendCards: {
    center: "중앙 각인",
    rightTop: "오른쪽 위 각인",
    rightBottom: "오른쪽 아래 각인",
    leftTop: "왼쪽 위 각인",
    leftBottom: "왼쪽 아래 각인",
    keytop: "키톱",
    sidewall: "{side} 측면",
  },
  stemCards: {
    clearance: "클리어런스",
  },
  shapeProfiles: {
    "custom-shell": {
      label: "커스텀 셸",
      fieldGroups: {
        shape: {
          title: "키캡 형상",
          description: "키캡 전체 크기, 상면 중앙 높이, 위쪽으로 좁아지는 정도, 상단 모서리 R과 본체 숄더 R을 조정합니다. 폭과 깊이는 각각 {unitBase} mm를 1u로 환산합니다.",
        },
        top: {
          title: "키톱",
          description: "평면 / 원통 / 구면을 전환하고 앞뒤와 좌우 기울기를 조정할 수 있습니다. 모서리 높이 입력으로 전환해도 내부에서는 pitch / roll로 정규화됩니다.",
        },
        topHat: {
          title: "Top Hat",
          description: "기존 키톱 위에 추가하는 작은 상면의 사용 여부, 윗면 / 아랫면 치수, R, 높이, 숄더 각도를 조정합니다.",
        },
        legend: {
          title: "각인",
          description: "키톱의 여러 위치와 측면의 문자, 서체, 모양, 위치, 돌출 높이를 한곳에서 조정합니다. 여러 글자도 그대로 입력할 수 있습니다.",
        },
        homing: {
          title: "손가락 위치 표시",
          description: "F 키나 J 키처럼 손끝으로 위치를 알 수 있는 돌출부를 조정합니다. 각인과 별도로 설정할 수 있습니다.",
        },
        stem: {
          title: "장착부",
        },
      },
    },
    typewriter: {
      label: "타자기",
      fieldGroups: {
        shape: {
          title: "키캡 형상",
          description: "타자기풍의 얇은 키톱 외형과 두께를 조정합니다. 폭과 깊이는 각각 {unitBase} mm를 1u로 환산하며, R이 커질수록 둥글고 작아질수록 사각형에 가까워집니다.",
        },
        top: {
          title: "키톱",
          description: "앞뒤와 좌우 기울기를 각도 또는 모서리 높이로 편집할 수 있습니다. 모서리 높이 입력은 내부에서 pitch / roll로 정규화됩니다.",
        },
        legend: {
          title: "각인",
          description: "키톱의 여러 위치와 측면의 문자, 서체, 모양, 위치, 돌출 높이를 한곳에서 조정합니다. 여러 글자도 그대로 입력할 수 있습니다.",
        },
        homing: {
          title: "손가락 위치 표시",
          description: "F 키나 J 키처럼 손끝으로 위치를 알 수 있는 돌출부를 조정합니다. 각인과 별도로 설정할 수 있습니다.",
        },
        stem: {
          title: "장착부",
        },
      },
    },
    "jis-enter": {
      label: "JIS Enter",
      fieldGroups: {
        shape: {
          title: "키캡 형상",
          description: "일반적인 JIS / ISO 계열 세로형 Enter footprint를 기준으로 전체 치수, 상면 중앙 높이, 왼쪽 아래 파임, 상단 모서리 R과 본체 숄더 R을 조정합니다. 폭과 깊이는 각각 {unitBase} mm를 1u로 환산합니다.",
        },
        top: {
          title: "키톱",
          description: "커스텀 셸처럼 평면 / 원통 / 구면, 앞뒤와 좌우 기울기를 조정할 수 있습니다.",
        },
        topHat: {
          title: "Top Hat",
          description: "JIS Enter 키톱 외형에서 안쪽으로 여유를 두고 추가하는 상면의 사용 여부, R, 높이, 숄더 각도를 조정합니다.",
        },
        legend: {
          title: "각인",
          description: "키톱의 여러 위치와 측면의 문자, 서체, 모양, 위치, 돌출 높이를 한곳에서 조정합니다. 여러 글자도 그대로 입력할 수 있습니다.",
        },
        homing: {
          title: "손가락 위치 표시",
          description: "F 키나 J 키처럼 손끝으로 위치를 알 수 있는 돌출부를 조정합니다. 각인과 별도로 설정할 수 있습니다.",
        },
        stem: {
          title: "장착부",
        },
      },
    },
    "typewriter-jis-enter": {
      label: "타자기 JIS Enter",
      fieldGroups: {
        shape: {
          title: "키캡 형상",
          description: "타자기풍의 얇은 JIS Enter footprint를 기준으로 전체 치수, 키톱 두께, 왼쪽 아래 파임, R을 조정합니다. 폭과 깊이는 각각 {unitBase} mm를 1u로 환산합니다.",
        },
        top: {
          title: "키톱",
          description: "타자기 형상처럼 림, 앞뒤와 좌우 기울기, 장착 기준 높이를 조정할 수 있습니다.",
        },
        legend: {
          title: "각인",
          description: "키톱의 여러 위치와 측면의 문자, 서체, 모양, 위치, 돌출 높이를 한곳에서 조정합니다. 여러 글자도 그대로 입력할 수 있습니다.",
        },
        homing: {
          title: "손가락 위치 표시",
          description: "F 키나 J 키처럼 손끝으로 위치를 알 수 있는 돌출부를 조정합니다. 각인과 별도로 설정할 수 있습니다.",
        },
        stem: {
          title: "장착부",
        },
      },
    },
  },
  fieldGroups: {
    shapeDescriptionShell: "키캡 전체 크기, 상면 중앙 높이, 위쪽으로 좁아지는 정도, 상단 모서리 R과 본체 숄더 R을 조정합니다. 폭과 깊이는 각각 {unitBase} mm를 1u로 환산합니다.",
    shapeDescriptionTypewriter: "타자기풍의 얇은 키톱 외형과 두께를 조정합니다. 폭과 깊이는 각각 {unitBase} mm를 1u로 환산하며, R이 커질수록 둥글고 작아질수록 사각형에 가까워집니다.",
    topDescription: "앞뒤와 좌우 기울기를 각도 또는 모서리 높이로 편집할 수 있습니다. 모서리 높이 입력은 내부에서 pitch / roll로 정규화됩니다.",
  },
  fields: {
    name: {
      label: "이름",
      hint: "3MF, STEP, STL, 편집 데이터 JSON의 저장 파일 이름으로 사용됩니다",
    },
    shapeProfile: {
      label: "기본 형상",
      hint: "사용할 기본 형상을 선택합니다",
    },
    keyWidth: {
      label: "폭",
      hint: "폭과 키 크기는 연동됩니다. {unitBase} mm = 1u입니다.",
      secondaryLabel: "키 크기",
      miniLabel: "폭",
    },
    keyDepth: {
      label: "깊이",
      hint: "깊이와 깊이 크기는 연동됩니다. {unitBase} mm = 1u입니다.",
      secondaryLabel: "깊이 크기",
      miniLabel: "깊이",
    },
    wallThickness: {
      label: "두께",
      hint: "사이드월과 키톱의 재료 두께를 따로 설정합니다",
      primaryMiniLabel: "사이드월",
      secondaryLabel: "키톱",
    },
    topThickness: {
      label: "키톱 두께",
      hint: "키톱 상면 아래에 남기는 재료 두께입니다",
    },
    typewriterCornerRadius: {
      label: "R",
      hint: "{maxRadius}이면 둥글고, 0 mm에 가까울수록 모서리가 살아납니다.",
    },
    topCornerRadius: {
      label: "상면 R",
      hint: "키톱 상면의 네 모서리를 함께 둥글게 합니다. 현재 최대값은 {maxRadius}입니다.",
    },
    topCornerRadiusIndividualEnabled: {
      label: "개별",
      hint: "켜면 네 모서리의 R을 각각 조정할 수 있습니다.",
    },
    topCornerRadiusLeftTop: {
      label: "왼쪽 위 R",
    },
    topCornerRadiusRightTop: {
      label: "오른쪽 위 R",
    },
    topCornerRadiusRightBottom: {
      label: "오른쪽 아래 R",
    },
    topCornerRadiusLeftBottom: {
      label: "왼쪽 아래 R",
    },
    jisEnterNotchWidth: {
      label: "파임 폭",
      hint: "왼쪽 아래 파임의 가로 폭입니다. 최댓값은 {maxWidth}입니다.",
    },
    jisEnterNotchDepth: {
      label: "파임 깊이",
      hint: "왼쪽 아래 파임의 앞뒤 깊이입니다. 최댓값은 {maxDepth}입니다.",
    },
    topScale: {
      label: "상면 좁아짐",
      hint: "숫자가 작을수록 폭과 깊이 비율을 유지한 채 상면이 좁아집니다",
    },
    keycapEdgeRadius: {
      label: "상단 모서리 R",
      hint: "키톱과 사이드월이 만나는 부분을 둥글게 합니다. 0 mm이면 현재와 같은 각진 면입니다. 현재 최댓값은 {maxRadius}입니다.",
    },
    keycapShoulderRadius: {
      label: "숄더 R",
      hint: "키캡 본체의 숄더를 조정합니다. 0은 각진 면, 양수는 둥글게 부풀림, 음수는 오목하게 파임입니다. 현재 범위는 {minRadius}부터 {maxRadius}까지입니다.",
    },
    bodyColor: {
      label: "본체 색상",
      hint: "색상 코드를 직접 입력하거나 색상 선택기로 고를 수 있습니다",
    },
    topCenterHeight: {
      label: "상면 중앙 높이",
      typewriterLabel: "키톱 두께",
      hint: "dish를 적용하기 전의 키톱 중앙입니다. 현재 중앙 표면은 {height}입니다.",
      typewriterHint: "얇은 키톱의 바닥에서 상면까지의 두께입니다",
    },
    topOffset: {
      label: "키톱 중심 오프셋",
      hint: "장착부 위치는 그대로 두고 키톱 중심만 좌우 / 앞뒤로 이동합니다",
    },
    topOffsetX: {
      label: "좌우 오프셋",
      hint: "장착부 위치는 그대로 두고 키톱 중심을 좌우로 이동합니다",
    },
    topOffsetY: {
      label: "앞뒤 오프셋",
      hint: "장착부 위치는 그대로 두고 키톱 중심을 앞뒤로 이동합니다",
    },
    typewriterMountHeight: {
      label: "상면 기준 높이",
      hint: "키톱 본체의 상면 중앙에서 장착부 하단까지의 거리입니다. 현재 최솟값은 {minHeight}입니다.",
    },
    topSurfaceShape: {
      label: "키톱 형상",
      hint: "평면은 납작한 면, 원통은 한 방향, 구면은 모든 방향으로 휘어집니다",
    },
    dishDepth: {
      label: "깊이",
      cylindricalHint: "현재 범위는 {minDepth}~{maxDepth}입니다. 양수는 한 방향으로 오목하게, 음수는 볼록하게 만듭니다.",
      sphericalHint: "현재 범위는 {minDepth}~{maxDepth}입니다. 양수는 그릇 모양으로 오목하게, 음수는 구면으로 볼록하게 만듭니다.",
      flatHint: "평면에서는 적용되지 않습니다.",
    },
    topHatEnabled: {
      label: "탑햇 추가",
      hint: "기존 키톱 위에 별도 형상의 작은 키톱을 추가합니다.",
    },
    topHatSeparateColorEnabled: {
      label: "본체와 색상 분리",
      hint: "켜면 탑햇을 별도 부품으로 내보내고 개별 색상을 설정할 수 있습니다.",
    },
    topHatColor: {
      label: "탑햇 색상",
      hint: "색상 코드를 직접 입력하거나 색상 선택기로 고를 수 있습니다",
    },
    topHatSurfaceShape: {
      label: "탑햇 형상",
      hint: "일반 키톱 형상과 별도로 설정하는 탑햇 상면 형상입니다.",
    },
    topHatDishDepth: {
      label: "탑햇 깊이",
      cylindricalHint: "현재 범위는 {minDepth}~{maxDepth}입니다. 양수는 탑햇 상면을 한 방향으로 오목하게, 음수는 볼록하게 만듭니다.",
      sphericalHint: "현재 범위는 {minDepth}~{maxDepth}입니다. 양수는 그릇 모양으로 오목하게, 음수는 구면으로 볼록하게 만듭니다.",
      flatHint: "평면에서는 적용되지 않습니다.",
    },
    topHatTopWidth: {
      label: "상면 가로폭",
      hint: "추가 키톱 상면의 가로폭입니다. 현재 최대값은 {maxWidth}입니다.",
      secondaryLabel: "상면 크기",
      miniLabel: "폭",
    },
    topHatTopDepth: {
      label: "상면 깊이",
      hint: "추가 키톱 상면의 앞뒤 치수입니다. 현재 최대값은 {maxDepth}입니다.",
      secondaryLabel: "상면 깊이 크기",
      miniLabel: "깊이",
    },
    topHatBottomWidth: {
      label: "바닥면 가로폭",
      hint: "추가 키톱 바닥면의 가로폭입니다. 현재 최대값은 {maxWidth}입니다.",
      secondaryLabel: "바닥면 크기",
      miniLabel: "폭",
    },
    topHatBottomDepth: {
      label: "바닥면 깊이",
      hint: "추가 키톱 바닥면의 앞뒤 치수입니다. 현재 최대값은 {maxDepth}입니다.",
      secondaryLabel: "바닥면 깊이 크기",
      miniLabel: "깊이",
    },
    topHatInset: {
      label: "상면 축소량",
      hint: "엔터 키톱 윤곽에서 안쪽으로 줄이는 양입니다. 현재 최대값은 {maxInset}입니다.",
    },
    topHatTopRadius: {
      label: "상면 R",
      hint: "추가 키톱 상면의 모서리 반경입니다. 현재 최대값은 {maxRadius}입니다.",
    },
    topHatBottomRadius: {
      label: "바닥면 R",
      hint: "추가 키톱 바닥면의 모서리 반경입니다. 현재 최대값은 {maxRadius}입니다.",
    },
    topHatBottomRadiusIndividualEnabled: {
      label: "개별",
      hint: "켜면 추가 키톱 바닥면 네 모서리의 R을 각각 조정할 수 있습니다.",
    },
    topHatBottomRadiusLeftTop: {
      label: "바닥면 왼쪽 위 R",
    },
    topHatBottomRadiusRightTop: {
      label: "바닥면 오른쪽 위 R",
    },
    topHatBottomRadiusRightBottom: {
      label: "바닥면 오른쪽 아래 R",
    },
    topHatBottomRadiusLeftBottom: {
      label: "바닥면 왼쪽 아래 R",
    },
    topHatTopRadiusIndividualEnabled: {
      label: "개별",
      hint: "켜면 추가 키톱 상면 네 모서리의 R을 각각 조정할 수 있습니다.",
    },
    topHatTopRadiusLeftTop: {
      label: "왼쪽 위 R",
    },
    topHatTopRadiusRightTop: {
      label: "오른쪽 위 R",
    },
    topHatTopRadiusRightBottom: {
      label: "오른쪽 아래 R",
    },
    topHatTopRadiusLeftBottom: {
      label: "왼쪽 아래 R",
    },
    topHatHeight: {
      label: "높이",
      hint: "기존 키톱 면에서 추가 상면까지의 높이입니다. 음수는 키톱을 파냅니다. 현재 범위는 {minHeight}부터 {maxHeight}까지입니다.",
    },
    topHatShoulderAngle: {
      label: "shoulder 각도",
      hint: "추가 상면에서 어깨로 내려가는 각도입니다. 값이 클수록 급해집니다.",
    },
    topHatShoulderRadius: {
      label: "shoulder R",
      hint: "0이면 각진 면이고, 양수는 둥글게 부풀며 음수는 오목하게 들어갑니다. 현재 범위는 {minRadius}부터 {maxRadius}까지입니다.",
    },
    rimEnabled: {
      label: "키 림 추가",
      hint: "키톱 외주를 별도 부품으로 덮습니다",
    },
    rimWidth: {
      label: "키 림 폭",
      hint: "키톱을 정면에서 봤을 때의 띠 폭입니다. {maxWidth}이면 전체 표면까지 넓어집니다.",
    },
    rimHeightUp: {
      label: "위쪽 높이",
      hint: "0이면 상면과 같은 높이입니다. 양수이면 위로 늘어납니다.",
    },
    rimHeightDown: {
      label: "아래쪽 높이",
      hint: "0이면 하면과 같은 높이입니다. 양수이면 아래로 늘어납니다.",
    },
    rimColor: {
      label: "키 림 색상",
      hint: "색상 코드를 직접 입력하거나 색상 선택기로 고를 수 있습니다",
    },
    topSlopeInputMode: {
      label: "기울기 입력 방식",
      hint: "각도로 입력할지, 모서리 높이로 입력할지 선택합니다",
    },
    topPitchDeg: {
      label: "앞뒤 기울기",
      hint: "양수이면 뒤쪽이 높아집니다. 현재: 앞 {front} / 뒤 {back}",
    },
    topRollDeg: {
      label: "좌우 기울기",
      hint: "양수이면 오른쪽이 높아집니다. 현재: 왼쪽 {left} / 오른쪽 {right}",
    },
    topFrontHeight: {
      label: "앞쪽 높이",
      hint: "상면 기준면의 앞쪽 높이입니다. 중앙 높이는 고정되며 현재 앞뒤 기울기는 {pitch}입니다.",
    },
    topBackHeight: {
      label: "뒤쪽 높이",
      hint: "상면 기준면의 뒤쪽 높이입니다. 중앙 높이는 고정되며 현재 앞뒤 기울기는 {pitch}입니다.",
    },
    topLeftHeight: {
      label: "왼쪽 높이",
      hint: "상면 기준면의 왼쪽 높이입니다. 중앙 높이는 고정되며 현재 좌우 기울기는 {roll}입니다.",
    },
    topRightHeight: {
      label: "오른쪽 높이",
      hint: "상면 기준면의 오른쪽 높이입니다. 중앙 높이는 고정되며 현재 좌우 기울기는 {roll}입니다.",
    },
    legendEnabled: {
      label: "키톱 각인 추가",
      hint: "끄면 문자 형상을 만들지 않습니다",
    },
    legendPrintNotice: "프린터나 슬라이서의 정밀도에 따라 문자 크기나 굵기 보정을 조정해야 할 수 있습니다.",
    legendText: {
      label: "입력 문자",
      hint: "여러 글자를 그대로 입력할 수 있습니다",
      placeholder: "A / Shift / あ",
    },
    legendContentType: {
      label: "각인 내용",
      hint: "문자를 넣을지 아이콘을 넣을지 선택합니다.",
    },
    legendIconSet: {
      label: "아이콘 세트",
      hint: "각인에 사용할 아이콘 세트를 선택합니다.",
    },
    legendIconName: {
      label: "아이콘",
      hint: "{set} 아이콘 {count}개에서 검색할 수 있습니다.",
    },
    legendIconFill: {
      label: "아이콘 채우기",
      hint: "선택한 아이콘이 지원할 때 외곽선과 채우기 스타일을 전환합니다.",
    },
    legendFontKey: {
      label: "서체",
      staticHint: "돋보기로 검색할 수 있습니다",
      variableHint: "돋보기로 검색할 수 있습니다. 지원되는 style은 오른쪽에서 선택합니다.",
      userHint: "이 브라우저에 추가한 내 폰트를 사용합니다",
      missingHint: "참조된 내 폰트를 다시 추가해 주세요",
    },
    legendFontStyleKey: {
      label: "폰트 내 스타일",
      selectableHint: "내장 style을 사용합니다",
      defaultHint: "폰트 이름 그대로 사용합니다",
    },
    legendUnderlineEnabled: {
      label: "밑줄 추가",
      hint: "밑줄 위치와 두께는 font 파일의 정보를 사용합니다. 임의의 모양으로 대체하지 않습니다.",
    },
    legendSize: {
      label: "각인 크기",
      hint: "각인할 문자 또는 아이콘의 크기를 변경합니다.",
    },
    legendOutlineDelta: {
      label: "굵기 보정",
      hint: "0은 원래 윤곽입니다. 양수이면 굵게, 음수이면 가늘게 합니다.",
    },
    legendHeight: {
      label: "문자 높이",
      hint: "0이면 상면 셸의 대부분을 채우는 매립 각인이 되고, 값을 올리면 돌출됩니다.",
    },
    legendEmbed: {
      label: "안쪽 매립",
      hint: "돌출된 문자의 뿌리를 키톱 내부로 얼마나 넣을지입니다. 높이가 0이면 상면 셸 대부분까지 자동으로 매립됩니다.",
    },
    legendColor: {
      label: "각인 색상",
      hint: "색상 코드를 직접 입력하거나 색상 선택기로 고를 수 있습니다",
    },
    legendOffsetX: {
      label: "좌우 위치",
      hint: "문자를 좌우로 움직입니다",
    },
    legendOffsetY: {
      label: "앞뒤 위치",
      hint: "문자를 앞뒤로 움직입니다",
    },
    sideLegend: {
      enabled: {
        label: "{side} 측벽 각인 추가",
        hint: "끄면 {side} 쪽 문자 형상을 만들지 않습니다",
      },
      color: {
        label: "{side} 각인 색상",
        hint: "색상 코드를 직접 입력하거나 색상 선택기로 고를 수 있습니다",
      },
      text: {
        label: "{side} 입력 문자",
        hint: "여러 글자를 그대로 입력할 수 있습니다",
      },
      contentType: {
        label: "{side} 각인 내용",
        hint: "문자를 넣을지 아이콘을 넣을지 선택합니다.",
      },
      iconSet: {
        label: "{side} 아이콘 세트",
        hint: "각인에 사용할 아이콘 세트를 선택합니다.",
      },
      iconName: {
        label: "{side} 아이콘",
      },
      iconFill: {
        label: "{side} 아이콘 채우기",
        hint: "선택한 아이콘이 지원할 때 외곽선과 채우기 스타일을 전환합니다.",
      },
      fontKey: {
        label: "{side} 서체",
      },
      fontStyleKey: {
        label: "{side} 폰트 내 스타일",
      },
      underlineEnabled: {
        label: "{side} 밑줄 추가",
        hint: "밑줄 위치와 두께는 font 파일의 정보를 사용합니다. 임의의 모양으로 대체하지 않습니다.",
      },
      size: {
        label: "{side} 각인 크기",
        hint: "측벽에 각인할 문자 또는 아이콘의 크기를 변경합니다.",
      },
      outlineDelta: {
        label: "{side} 굵기 보정",
      },
      height: {
        label: "{side} 문자 높이",
        hint: "0이면 측벽과 같은 높이의 매립 각인이 되고, 값을 올리면 바깥쪽으로 돌출됩니다.",
      },
      offsetX: {
        label: "{side} 가로 위치",
        hint: "측벽 위에서 문자를 좌우로 움직입니다",
      },
      offsetY: {
        label: "{side} 세로 위치",
        hint: "측벽 위에서 문자를 위아래로 움직입니다",
      },
    },
    homingBarEnabled: {
      label: "위치 표시 추가",
      hint: "손가락으로 위치를 찾기 쉽게 합니다",
    },
    homingBarLength: {
      label: "위치 표시 길이",
      hint: "좌우로 얼마나 넓힐지입니다",
    },
    homingBarWidth: {
      label: "위치 표시 두께",
      hint: "위치 표시의 겉보기 두께입니다",
    },
    homingBarHeight: {
      label: "위치 표시 높이",
      hint: "표면에서 얼마나 튀어나오게 할지입니다",
    },
    homingBarChamfer: {
      label: "위치 표시 모따기",
      hint: "작은 값은 위쪽 모서리를 살짝 둥글게 하고, 큰 값은 반원형 봉우리에 가까워집니다.",
    },
    homingBarOffsetY: {
      label: "위치 표시 앞뒤 위치",
      hint: "위치 표시를 앞뒤로 움직입니다",
    },
    homingBarColor: {
      label: "위치 표시 색상",
      hint: "색상 코드를 직접 입력하거나 색상 선택기로 고를 수 있습니다",
    },
    stemType: {
      label: "장착 방식",
      hint: "키캡이 맞을 스위치 종류를 선택합니다",
    },
    jStemLp01PreviewColor: {
      label: "미리보기 색상",
      hint: "J-STEM-LP01 참조 부품의 표시 색상을 선택합니다",
    },
    stemOuterDelta: {
      label: "외주 보정",
      hint: "0이 표준입니다. 양수이면 외주 원을 굵게, 음수이면 가늘게 합니다.",
    },
    stemCrossMargin: {
      label: "끼움 여유",
      mxHint: "0이 표준입니다. 양수이면 십자 구멍을 넓히고, 음수이면 좁힙니다.",
      chocV1Hint: "0이 표준입니다. 양수이면 두 갈래를 가늘게 해 느슨하게, 음수이면 두껍게 해 빡빡하게 합니다.",
      alpsHint: "0이 표준입니다. 양수이면 삽입부를 가늘게 해 느슨하게, 음수이면 두껍게 해 빡빡하게 합니다.",
      jStemLp01Hint: "초기값은 0.1 mm입니다. 실제 부품이 빡빡하면 값을 키우고, 헐거우면 줄여 LP01 받침 홈 외형을 0.02 mm 단위로 조정합니다.",
      disabledHint: "장착부를 만들지 않을 때는 사용하지 않습니다",
    },
    stemCrossChamfer: {
      label: "입구 모따기",
      hint: "0이 표준입니다. 값을 키우면 십자 구멍 입구만 넓힙니다.",
      disabledHint: "십자형 마운트가 아닐 때는 사용하지 않습니다",
    },
    stemInsetDelta: {
      label: "축 시작 위치 보정",
      hint: "0이 표준입니다. 양수이면 바닥면에서 시작 위치를 올리고, 음수이면 아래로 늘립니다.",
      jStemLp01Hint: "0이 표준입니다. 값을 키우면 LP01 받침 홈을 더 깊게 만듭니다.",
      disabledHint: "장착부를 만들지 않을 때는 사용하지 않습니다",
    },
  },
  options: {
    stemType: {
      none: "없음",
      mx: "MX 호환",
      choc_v1: "Choc v1",
      choc_v2: "Choc v2",
      alps: "Alps / Matias",
      j_stem_lp01: "J-STEM-LP01(실험적)",
    },
    jStemLp01PreviewColor: {
      clear: "투명",
      white: "흰색",
      orange: "오렌지",
    },
    topSurfaceShape: {
      flat: "평면",
      cylindrical: "원통",
      spherical: "구면",
    },
    topSlopeInputMode: {
      angle: "각도로 조정",
      "edge-height": "모서리 높이로 조정",
    },
    legendContentType: {
      text: "문자",
      icon: "아이콘",
    },
    legendIconSet: {
      lucide: "Lucide",
      "material-symbols": "Material Symbols",
      "font-awesome": "Font Awesome Free Solid",
      "remix-icon": "Remix Icon",
    },
  },
  stemDescriptions: {
    none: "장착부를 만들지 않습니다. 외형이나 각인만 확인하고 싶을 때 사용합니다.",
    mx: "Cherry MX 호환 십자 형상입니다. Cherry / Gateron / Kailh BOX 등 일반적인 기계식 키보드 스위치에 맞습니다.",
    choc_v1: "Kailh Choc v1용 두 갈래 형상입니다. 슬림 키보드용 Choc v1 스위치에 맞습니다.",
    alps: "Alps / Matias 계열 삽입 형상입니다. 대응하는 Alps 계열 스위치에 맞습니다.",
    choc_v2: "Kailh Choc v2용 십자 형상입니다. Choc v2 스위치에 맞는 장착부를 만듭니다.",
    j_stem_lp01: "J-STEM-LP01과 함께 사용할 수 있도록 키캡 뒤쪽 스템 장착면에 LP01 상면을 받는 홈을 파냅니다. 실험적 설정입니다.",
  },
  sideLabels: {
    front: "앞면",
    back: "뒷면",
    left: "왼쪽",
    right: "오른쪽",
  },
  font: {
    defaultStyleLabel: "폰트 기본값 사용",
    searchAriaLabel: "폰트 검색",
    searchDialogLabel: "폰트 검색",
    searchPlaceholder: "폰트 이름으로 검색",
    segmentControlLabel: "폰트 종류",
    builtinFontsSegment: "내장 폰트",
    myFontsSegment: "내 폰트",
    noResults: "일치하는 폰트가 없습니다",
    variableMeta: "가변 / 명명된 스타일",
    staticMeta: "정적 글꼴",
    userMeta: "내 폰트",
    remoteMeta: "CDN 폰트",
    missingMeta: "내 폰트 미로드",
    addLocalFont: "로컬 폰트 추가",
    addLocalFontHint: "TTF / OTF 선택",
    addCdnFont: "CDN / embed에서 추가",
    addCdnFontHint: "Google Fonts, CSS 또는 TTF / OTF URL",
    cdnFontUrlLabel: "CDN / embed에서 추가",
    sourceModeLabel: "입력 종류",
    sourceModes: {
      googleFonts: "Google Fonts",
      cssUrl: "CSS URL",
      fontFace: "@font-face",
      fontFile: "TTF / OTF URL",
    },
    sourcePlaceholders: {
      googleFonts: "@import url(\"https://fonts.googleapis.com/css2?family=Bangers&display=swap\");",
      cssUrl: "https://fonts.googleapis.com/css2?family=Bangers&display=swap",
      fontFace: "@font-face {\n  font-family: \"My Font\";\n  src: url(\"https://example.com/fonts/MyFont-Regular.ttf\") format(\"truetype\");\n}",
      fontFile: "https://example.com/fonts/MyFont-Regular.ttf",
    },
    sourceHints: {
      googleFonts: "Google Fonts의 @import 또는 <link> 조각을 붙여넣습니다.",
      cssUrl: "font-face 규칙을 반환하는 CSS 파일 URL을 붙여넣습니다.",
      fontFace: "@font-face CSS를 그대로 붙여넣습니다. src는 TTF / OTF로 해석되어야 합니다.",
      fontFile: "CORS fetch가 허용되는 TTF / OTF 파일 직접 링크를 붙여넣습니다.",
    },
    addMissingLocalFont: "같은 폰트 추가",
    noLocalFontFile: "TTF / OTF 폰트 파일을 찾을 수 없습니다.",
    noFontSourceUrl: "CDN / embed URL을 입력해 주세요.",
    unsupportedLocalFont: "{fileName}은(는) 지원하지 않는 폰트 형식입니다. TTF / OTF를 선택해 주세요.",
    emptyLocalFont: "{fileName}은(는) 빈 폰트 파일입니다.",
    localTitle: "로컬 폰트",
    localBody: "이 브라우저에서 {fileName}{byteLength}을(를) 사용 중입니다. 프로젝트 ZIP 또는 JSON에는 폰트 파일 본체를 포함하지 않습니다.",
    remoteTitle: "CDN 폰트",
    remoteBody: "출처: {source}",
    missingTitle: "내 폰트가 로드되지 않았습니다",
    missingBody: "이 저장 데이터가 참조하는 폰트 파일이 이 브라우저에 없습니다. 같은 TTF / OTF를 추가하면 복원할 수 있습니다.",
    deleteLocalFont: "삭제",
    localFontMultipleLabel: "내 폰트 {count}개",
    localFontAdded: "{font}을(를) 내 폰트에 추가했습니다",
    localFontsAdded: "내 폰트 {count}개를 추가했습니다",
    localFontDeleted: "{font}을(를) 내 폰트에서 삭제했습니다",
    remoteFontAdded: "{font}을(를) CDN에서 내 폰트에 추가했습니다",
    localFontLoadLabel: "내 폰트 추가",
    localFontLoadNote: "{font}을(를) 브라우저 내 내 폰트에 추가",
    localFontLoadFailed: "내 폰트 추가에 실패했습니다",
    localFontLoadFailedLabel: "내 폰트 추가 실패",
    remoteFontLoadLabel: "CDN 폰트 추가",
    remoteFontLoadNote: "{source}에서 {font}을(를) 추가",
    remoteFontLoadFailed: "CDN 폰트 추가에 실패했습니다",
    remoteFontLoadFailedLabel: "CDN 폰트 추가 실패",
    landingPageLinkLabel: "폰트 페이지 열기",
    landingPageLinkAriaLabel: "{font}의 {page} 페이지를 새 탭에서 열기",
    attributionTitle: "저작권 및 라이선스 표기",
    attributions: {
      "kurobara-cinderella-regular": [
        "사용 폰트: 黒薔薇シンデレラ Version 1.00.20180805",
        "저작권 표기: Copyright(c) 2017 M+ FONTS PROJECT/MODI",
        "라이선스 표기: This font is free software. Unlimited permission is granted to use, copy, and distribute it, with or without modification, either commercially or noncommercially. THIS FONT IS PROVIDED \"AS IS\" WITHOUT WARRANTY.",
        "파생 원본 라이선스: SIL Open Font License, Version 1.1",
        "배포 페이지: https://modi.jpn.org/font_kurobara-cinderella.php"
      ],
    },
  },
  icons: {
    searchAriaLabel: "아이콘 검색",
    searchDialogLabel: "아이콘 검색",
    searchPlaceholder: "아이콘 이름으로 검색",
    noResults: "일치하는 아이콘이 없습니다",
    recommendedLabel: "키캡 추천 후보",
    searchResultsLabel: "검색 결과",
    attributionTitle: "아이콘 저작권 및 라이선스 표기",
    openCatalog: "{set}에서 찾기",
    attributions: {
      lucide: [
        "Lucide Icons: ISC License",
        "Source: https://lucide.dev/",
        "Icon data package CDN: https://cdn.jsdelivr.net/npm/@lucide/icons@latest/dist/esm/lucide-icons.mjs"
      ],
      "material-symbols": [
        "Material Symbols by Google: Apache License 2.0",
        "Source: https://fonts.google.com/icons",
        "Icon data package: @iconify-json/material-symbols",
        "Icon data package CDN: https://cdn.jsdelivr.net/npm/@iconify-json/material-symbols@latest/icons.json"
      ],
      "font-awesome": [
        "Font Awesome Free Solid Icons: CC BY 4.0",
        "Code package: MIT License",
        "Source: https://fontawesome.com/",
        "Icon data package CDN: https://cdn.jsdelivr.net/npm/@fortawesome/free-solid-svg-icons@latest/index.mjs",
        "Downloaded Font Awesome Free files include attribution comments; do not remove upstream notices from redistributed files."
      ],
      "remix-icon": [
        "Remix Icon: Remix Icon License v1.0",
        "Source: https://remixicon.com/",
        "Icon data package CDN: https://cdn.jsdelivr.net/npm/remixicon@latest/fonts/remixicon.symbol.svg",
        "Permitted for functional or decorative use in larger works; do not sell as a standalone icon pack or use icons as logos/trademarks."
      ],
    },
  },
  partLabels: {
    body: "본체",
    topHat: "탑햇",
    rim: "키 림",
    legend: "각인",
    topLegend: "{position}",
    sideLegend: "{side} 측면 각인",
    homing: "위치 표시",
    jStemLp01: "J-STEM-LP01",
  },
  preview: {
    placeholder: "아직 미리보기를 표시하지 않았습니다. 디자인을 변경하면 최신 형상으로 자동 업데이트됩니다.",
    running: "미리보기를 업데이트하는 중",
    successSingle: "미리보기 업데이트가 완료되었습니다. {parts}을(를) 표시하고 있습니다.",
    successMultiple: "미리보기 업데이트가 완료되었습니다. {parts}을(를) 색상별로 나누어 표시하고 있습니다.",
    failed: "미리보기 업데이트에 실패했습니다",
    summary: "{elapsedMs} ms / {objectCount} objects / {vertexCount} vertices / {faceCount} triangles",
  },
  status: {
    notGenerated: "미생성",
    dirty: "입력 내용 반영 대기 중",
    loadedDirty: "불러온 편집 데이터 반영 대기 중",
  },
  importExport: {
    copied: "클립보드에 복사했습니다 ({byteLength}바이트)",
    copiedBase64: "Base64로 클립보드에 복사했습니다 ({byteLength}바이트)",
    copyLabel: "클립보드 복사",
    copyFailed: "클립보드에 복사하지 못했습니다",
    copyFailedLabel: "복사 실패",
    copyTextNote: "{characters}자를 텍스트로 복사했습니다",
    copyBase64Note: "Base64 {characters}자를 복사했습니다. 디코딩하면 파일로 복원할 수 있습니다.",
    loaded: "편집 데이터를 불러왔습니다 ({fileName})",
    loadLabel: "편집 데이터 불러오기",
    loadNote: "{fileName}을(를) 현재 편집 내용에 반영",
    loadNoteWithUnbound: "{fileName}을(를) 현재 편집 내용에 반영했습니다. 건너뛴 파라미터 {count}개를 표시합니다.",
    noJsonFile: "JSON 파일을 찾을 수 없습니다.",
    loadFailed: "편집 데이터 불러오기에 실패했습니다",
    loadFailedLabel: "편집 데이터 불러오기 실패",
    preparing: "저장 데이터를 준비하는 중",
    savedEditorData: "편집 데이터를 저장했습니다 ({byteLength} bytes)",
    editorDataLabel: "편집 데이터 JSON",
    editorDataNote: "화면에서 편집하는 파라미터를 JSON 형식으로 저장",
    savedThreeMf: "3MF 데이터를 저장했습니다 ({byteLength} bytes / 부품 {partCount}개)",
    threeMfLabel: "3MF 데이터",
    threeMfNote: "{parts}을(를) 3MF 형식으로 묶어 저장",
    savedStep: "STEP을 저장했습니다 ({byteLength} bytes)",
    stepLabel: "단일 형상 STEP",
    stepNote: "단일 형상을 STEP faceted B-rep으로 저장 ({faceCount} faces)",
    savedStl: "STL을 저장했습니다 ({byteLength} bytes)",
    stlLabel: "단색 STL",
    stlNote: "색상과 각인을 포함하지 않고 단일 메시 형상으로 저장",
    saveFailed: "저장에 실패했습니다",
    saveFailedLabel: "저장 실패",
    unsupportedExport: "지원하지 않는 export 형식입니다: {format}",
  },
  errors: {
    appRootMissing: "#app을 찾을 수 없습니다.",
    colorisLoadFailed: "Coloris를 불러오지 못했습니다.",
    unsupportedOffPurpose: "지원하지 않는 OFF 작업 용도입니다: {purpose}",
  },
  format: {
    listSeparator: ", ",
  },
});

export default ko;
