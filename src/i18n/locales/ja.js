const ja = Object.freeze({
  language: {
    label: "LANGUAGE",
    ariaLabel: "表示言語を選択",
    listLabel: "言語選択",
    options: {
      ja: "日本語",
      en: "English",
      zh: "中文",
      ko: "한국어",
    },
  },
  theme: {
    ariaLabel: "表示モードを選択",
    options: {
      light: "ライトモード",
      dark: "ダークモード",
    },
  },
  navigation: {
    label: "作業セクション",
    project: "プロジェクト",
    design: "設計",
    export: "書き出し",
  },
  actions: {
    back: "戻る",
    close: "閉じる",
    choose: "選ぶ",
    copy: "コピー",
    copied: "コピー済み",
    on: "オン",
    off: "オフ",
    saving: "保存しています...",
  },
  dropOverlay: {
    title: "プロジェクト / JSON / フォントをドロップ",
    body: "プロジェクト、保存済みの編集データ、互換入力 JSON、または TTF / OTF フォントを読み込みます。",
    chip: "ZIP / JSON / TTF / OTF",
  },
  importReport: {
    title: "JSON 読み込みレポート",
    unboundBody: "{fileName} のうち {count} 件のパラメータは現在の形状へ反映できなかったため読み飛ばしました。",
    unboundListLabel: "反映できなかったパラメータ",
    expand: "JSON 読み込みレポートを展開",
    collapse: "JSON 読み込みレポートを折りたたむ",
    more: "ほか {count} 件",
    deleteParam: "{path} を JSON から削除",
  },
  panels: {
    project: {
      title: "プロジェクト",
      body: "複数のキーキャップをまとめて保持し、一覧から現在の編集対象を切り替えます。",
    },
    design: {
      title: "設計",
      body: "選んだキーキャップの形や印字を、入力に合わせて右側へ自動反映しながら調整できます。",
    },
    export: {
      title: "書き出し",
      body: "3MF / STEP / STL の印刷データと、あとで編集を再開するための JSON を保存できます。",
    },
  },
  mobileInspector: {
    hide: "設計カードを上へしまう",
    show: "設計カードを戻す",
  },
  exportPanel: {
    copy: "コピー",
    copyBase64: "Base64 コピー",
    copyHint: "クリップボードへコピー",
    jsonChip: "編集再開用 JSON",
    jsonTitle: "編集データを保存",
    jsonBody: "形状、寸法、色、印字を JSON として保存します。あとでドラッグ&ドロップで再読込できます。",
    saveJson: "JSON を保存",
    threeMfChip: "印刷用 3MF",
    threeMfTitle: "3MFデータを保存",
    threeMfBody: "本体、目印、印字を含む印刷用データを 3MF 形式でまとめて保存します。",
    saveThreeMf: "3MF を保存",
    stepChip: "CAD交換用 STEP",
    stepTitle: "STEP を保存",
    stepBody: "単一形状を STEP/AP214 の faceted B-rep として保存します。色、印字、part 分離は含めません。CAD 連携や製造要件で STEP が必要な場合に使います。",
    saveStep: "STEP を保存",
    optionsTitle: "オプション",
    optionsBody: "通常の印刷データは 3MF を推奨します。CAD 連携では STEP、単純なメッシュだけ必要な場合は STL を使います。",
    optionsExpand: "オプションを展開",
    optionsCollapse: "オプションを折りたたむ",
    stlChip: "単色用 STL",
    stlTitle: "STL を保存",
    stlBody: "単一素材・単一メッシュの STL として保存します。色と印字は無視され、形状のみが出力されます。色分けや印字が必要な場合は 3MF を保存してください。",
    saveStl: "STL を保存",
  },
  project: {
    saveJson: "プロジェクト JSON を保存",
    copyJson: "プロジェクト JSON をコピー",
    importJson: "プロジェクト JSON を読み込む",
    importLabel: "プロジェクト JSON を貼り付け",
    importPlaceholder: "プロジェクト JSON の内容をここへ貼り付けます",
    importPaste: "クリップボードから貼り付け",
    importUpload: "ファイルを選択",
    importApply: "プロジェクトを読み込む",
    importing: "プロジェクトを読み込み中",
    importEmpty: "先にプロジェクト JSON を貼り付けてください。",
    importNotBundle: "KeycapMaker のプロジェクト JSON ではありません。",
    importFailed: "プロジェクトを読み込めませんでした: {message}",
    savedJson: "プロジェクト JSON を保存しました（{byteLength} バイト）",
    copying: "プロジェクト JSON をコピー中",
    copiedJson: "プロジェクト JSON をクリップボードへコピーしました（{byteLength} バイト）",
    copyFailed: "プロジェクト JSON をコピーできませんでした: {message}",
    pasted: "クリップボードの内容を貼り付けました",
    pasteFailed: "クリップボードを読み取れませんでした: {message}",
    templatesTitle: "キーボードテンプレート",
    templatesHint: "現在の形状と色を使って、キーごとに 1 個のキーキャップを持つプロジェクトを新規作成します。",
    templateBuilding: "{name} を作成中",
    templateProgress: "{name} を作成中（{done}/{total}）",
    templateLoaded: "{name} を読み込みました（キーキャップ {count} 個）",
    templateFailed: "テンプレートを作成できませんでした: {message}",
    templateReplaceConfirm: "現在のプロジェクト（キーキャップ {count} 個）を置き換えます。続行しますか？",
    templates: {
      qwerty: "QWERTY（ANSI 104）",
      qwertz: "QWERTZ（ISO 105）",
    },
    nameTitle: "プロジェクト名",
    nameLabel: "プロジェクト名",
    nameHint: "ZIP 内ディレクトリ名とプロジェクト manifest の名前に使います",
    keycapsTitle: "キーキャップ一覧",
    keycapsCount: "{count} 件",
    empty: "まだキーキャップがありません。",
    addCurrent: "編集中のキーキャップのコピーを追加",
    recapturePreview: "{name} のプレビューを再撮影",
    previewRecaptured: "プレビューを再撮影しました",
    reorderKeycap: "{name} の表示順を変更",
    selectKeycap: "{name} を編集中にする",
    activeKeycap: "編集中",
    exportAction: "書き出し",
    exportKeycap: "{name} を書き出す",
    exportChip: "キーキャップ書き出し",
    exportTitle: "{name} の書き出し",
    designAction: "設計",
    designKeycap: "{name} の設計",
    designChip: "キーキャップ設計",
    designTitle: "{name} の設計",
    deleteChip: "削除",
    deleteTitle: "キーキャップを削除",
    deleteBody: "このキーキャップをプロジェクト一覧から削除します。",
    deleteLastBody: "プロジェクトには1件以上のキーキャップが必要なため、このキーキャップは削除できません。",
    deleteAction: "削除",
    save: "プロジェクトを保存",
    edited: "プロジェクトを編集中",
    added: "{name} をプロジェクトへ追加しました",
    deleted: "{name} をプロジェクトから削除しました",
    reordered: "キーキャップ一覧の表示順を変更しました",
    loadedKeycap: "{name} に切り替えました",
    loaded: "プロジェクト {name} を読み込みました ({count} 件)",
    saving: "プロジェクトを保存しています",
    saved: "プロジェクトを保存しました",
    saveFailed: "プロジェクトの保存に失敗しました: {message}",
    directoryNotWritable: "このディレクトリには書き込めません。",
    previewDecodeFailed: "プレビュー画像を保存用データへ変換できませんでした。",
    invalidPath: "プロジェクト内パスが不正です: {path}",
    missingProjectFile: "プロジェクト内のファイルが見つかりません: {path}",
  },
  nameGroup: {
    title: "名称",
    description: "保存するときの名前です。3MF、STEP、STL、編集データ JSON に使われ、あとで読み込んでもこの名前が残ります。",
  },
  parameterGroupCaptions: {
    name: "保存ファイル名",
    top: "上面の形と傾き",
    topHat: "追加上面",
    legend: "文字と位置",
  },
  unitBasis: {
    title: "1u 換算",
    description: "現在は {unitBase} mm を 1u として表示します。",
    fieldLabel: "1u の基準",
    fieldHint: "狭ピッチなどの換算用です。モデル寸法は変わりません",
    readout: "現在の寸法: 横幅 {widthUnits}u / 奥行き {depthUnits}u",
  },
  fieldGroup: {
    expand: "{title}を展開",
    collapse: "{title}を折りたたむ",
  },
  legendCards: {
    center: "中央の印字",
    rightTop: "右上の印字",
    rightBottom: "右下の印字",
    leftTop: "左上の印字",
    leftBottom: "左下の印字",
    keytop: "キートップ",
    sidewall: "{side}サイドウォール",
  },
  stemCards: {
    clearance: "クリアランス",
  },
  shapeProfiles: {
    "custom-shell": {
      label: "カスタムシェル",
      fieldGroups: {
        shape: {
          title: "キーキャップの形",
          description: "キーキャップ全体の大きさ、上面中央の高さ、上に向かって細くなる具合、上端Rと本体の肩Rを調整します。横幅と奥行きはそれぞれ {unitBase} mm を 1u として換算します。",
        },
        top: {
          title: "キートップ",
          description: "フラット / シンドリカル / スフェリカルと、前後左右の傾きを調整できます。端の高さに切り替えた場合も内部では pitch / roll に正規化されます。",
        },
        topHat: {
          title: "トップハット",
          description: "既存のキートップ上へ追加する小さな上面の有無、天面 / 底面寸法、R、高さ、肩角度を調整します。",
        },
        legend: {
          title: "印字",
          description: "キートップ上の複数位置とサイドウォールの文字、書体、見た目、位置、盛り上がりをまとめて調整します。複数文字もそのまま入力できます。",
        },
        homing: {
          title: "指の目印",
          description: "F キーや J キーのように、指で触って分かる出っ張りを調整します。印字とは別に設定できます。",
        },
        stem: {
          title: "取り付け部分",
        },
      },
    },
    typewriter: {
      label: "タイプライター",
      fieldGroups: {
        shape: {
          title: "キーキャップの形",
          description: "タイプライター風の薄いキートップ外形と厚みを調整します。横幅と奥行きはそれぞれ {unitBase} mm を 1u として換算し、R を大きくすると丸く、小さくすると四角に近づきます。",
        },
        top: {
          title: "キートップ",
          description: "前後と左右の傾きを角度または端の高さで編集できます。端の高さに切り替えた場合も内部では pitch / roll に正規化されます。",
        },
        legend: {
          title: "印字",
          description: "キートップ上の複数位置とサイドウォールの文字、書体、見た目、位置、盛り上がりをまとめて調整します。複数文字もそのまま入力できます。",
        },
        homing: {
          title: "指の目印",
          description: "F キーや J キーのように、指で触って分かる出っ張りを調整します。印字とは別に設定できます。",
        },
        stem: {
          title: "取り付け部分",
        },
      },
    },
    "jis-enter": {
      label: "JISエンター",
      fieldGroups: {
        shape: {
          title: "キーキャップの形",
          description: "一般的な JIS / ISO 系の縦長 Enter footprint を基準に、全体寸法、上面中央の高さ、左下の欠き込み、上端Rと本体の肩Rを調整します。横幅と奥行きはそれぞれ {unitBase} mm を 1u として換算します。",
        },
        top: {
          title: "キートップ",
          description: "カスタムシェルと同じく、フラット / シンドリカル / スフェリカル、前後左右の傾きを調整できます。",
        },
        topHat: {
          title: "トップハット",
          description: "JIS Enter のキートップ外形から内側へ逃がして追加する上面の有無、R、高さ、肩角度を調整します。",
        },
        legend: {
          title: "印字",
          description: "キートップ上の複数位置とサイドウォールの文字、書体、見た目、位置、盛り上がりをまとめて調整します。複数文字もそのまま入力できます。",
        },
        homing: {
          title: "指の目印",
          description: "F キーや J キーのように、指で触って分かる出っ張りを調整します。印字とは別に設定できます。",
        },
        stem: {
          title: "取り付け部分",
        },
      },
    },
    "typewriter-jis-enter": {
      label: "タイプライターJISエンター",
      fieldGroups: {
        shape: {
          title: "キーキャップの形",
          description: "タイプライター風の薄い JIS Enter footprint を基準に、全体寸法、キートップの厚み、左下の欠き込み、R を調整します。横幅と奥行きはそれぞれ {unitBase} mm を 1u として換算します。",
        },
        top: {
          title: "キートップ",
          description: "タイプライターと同じく、リム、前後左右の傾き、取り付け基準高さを調整できます。",
        },
        legend: {
          title: "印字",
          description: "キートップ上の複数位置とサイドウォールの文字、書体、見た目、位置、盛り上がりをまとめて調整します。複数文字もそのまま入力できます。",
        },
        homing: {
          title: "指の目印",
          description: "F キーや J キーのように、指で触って分かる出っ張りを調整します。印字とは別に設定できます。",
        },
        stem: {
          title: "取り付け部分",
        },
      },
    },
  },
  fieldGroups: {
    shapeDescriptionShell: "キーキャップ全体の大きさ、上面中央の高さ、上に向かって細くなる具合、上端Rと本体の肩Rを調整します。横幅と奥行きはそれぞれ {unitBase} mm を 1u として換算します。",
    shapeDescriptionTypewriter: "タイプライター風の薄いキートップ外形と厚みを調整します。横幅と奥行きはそれぞれ {unitBase} mm を 1u として換算し、R を大きくすると丸く、小さくすると四角に近づきます。",
    topDescription: "前後と左右の傾きを角度または端の高さで編集できます。端の高さに切り替えた場合も内部では pitch / roll に正規化されます。",
  },
  fields: {
    name: {
      label: "名称",
      hint: "3MF、STEP、STL、編集データ JSON の保存名に使います",
    },
    shapeProfile: {
      label: "形のベース",
      hint: "使う基本形を選びます",
    },
    keyWidth: {
      label: "横幅",
      hint: "横幅とキーサイズは連動します。{unitBase} mm = 1u です",
      secondaryLabel: "キーサイズ",
      miniLabel: "横幅",
    },
    keyDepth: {
      label: "奥行き",
      hint: "奥行きと奥行きサイズは連動します。{unitBase} mm = 1u です",
      secondaryLabel: "奥行きサイズ",
      miniLabel: "奥行き",
    },
    wallThickness: {
      label: "肉厚",
      hint: "サイドウォールとキートップの材料厚です",
      primaryMiniLabel: "サイドウォール",
      secondaryLabel: "キートップ",
    },
    topThickness: {
      label: "キートップ肉厚",
      hint: "キートップ上面の裏側に残す厚みです",
    },
    typewriterCornerRadius: {
      label: "R",
      hint: "{maxRadius} で丸、0 mm に近づけると角が立ちます",
    },
    topCornerRadius: {
      label: "上面のR",
      hint: "キートップ上面の四隅をまとめて丸めます。現在の最大は {maxRadius} です",
    },
    topCornerRadiusIndividualEnabled: {
      label: "個別",
      hint: "オンにすると四隅のRを個別に調整できます",
    },
    topCornerRadiusLeftTop: {
      label: "左上R",
    },
    topCornerRadiusRightTop: {
      label: "右上R",
    },
    topCornerRadiusRightBottom: {
      label: "右下R",
    },
    topCornerRadiusLeftBottom: {
      label: "左下R",
    },
    jisEnterNotchWidth: {
      label: "欠き込み幅",
      hint: "左下に空ける横方向の欠き込みです。最大 {maxWidth} です",
    },
    jisEnterNotchDepth: {
      label: "欠き込み奥行き",
      hint: "左下に空ける前後方向の欠き込みです。最大 {maxDepth} です",
    },
    topScale: {
      label: "上面のすぼまり",
      hint: "数字を小さくすると、横幅と奥行きを同じ比率で保ったまま上面が細くなります",
    },
    keycapEdgeRadius: {
      label: "上端R",
      hint: "キートップとサイドウォールの接続部を丸めます。0 mm では現在と同じ角面です。現在の最大は {maxRadius} です",
    },
    keycapShoulderRadius: {
      label: "ショルダーR",
      hint: "キーキャップ本体の肩を、0 では角面、プラスで丸く膨らませ、マイナスで凹ませます。現在の範囲は {minRadius} から {maxRadius} です",
    },
    bodyColor: {
      label: "本体の色",
      hint: "カラーコードを直接入力するか、カラーピッカーで選べます",
    },
    topCenterHeight: {
      label: "上面中央の高さ",
      typewriterLabel: "キートップの厚み",
      hint: "dish を付ける前のキートップ中央です。現在の中央表面は {height} です",
      typewriterHint: "薄いキートップの底から上面までの厚みです",
    },
    topOffset: {
      label: "キートップ中心のオフセット",
      hint: "ステム位置は変えずに、キートップ中心だけを左右 / 前後へ動かします",
    },
    topOffsetX: {
      label: "左右のオフセット",
      hint: "ステム位置は変えずに、キートップ中心を左右へ動かします",
    },
    topOffsetY: {
      label: "前後のオフセット",
      hint: "ステム位置は変えずに、キートップ中心を前後へ動かします",
    },
    typewriterMountHeight: {
      label: "上面基準の高さ",
      hint: "キートップ本体の上面中央から取り付け部分の下端までの距離です。現在の最小値は {minHeight} です",
    },
    topSurfaceShape: {
      label: "キートップ形状",
      hint: "フラットは平面、シンドリカルは一方向、スフェリカルは全方向に曲がります",
    },
    dishDepth: {
      label: "深さ",
      cylindricalHint: "現在の範囲は {minDepth}〜{maxDepth} です。正値で一方向に凹み、負値で盛り上がります",
      sphericalHint: "現在の範囲は {minDepth}〜{maxDepth} です。正値で椀形に凹み、負値で球面状に盛り上がります",
      flatHint: "フラットでは効きません",
    },
    topHatEnabled: {
      label: "トップハットを付ける",
      hint: "既存のキートップ上に、別形状の小さいキートップを追加します",
    },
    topHatSeparateColorEnabled: {
      label: "本体と色を分ける",
      hint: "オンにするとトップハットを別パーツとして出力し、個別の色を設定できます",
    },
    topHatColor: {
      label: "トップハットの色",
      hint: "カラーコードを直接入力するか、カラーピッカーで選べます",
    },
    topHatSurfaceShape: {
      label: "トップハット形状",
      hint: "トップハット上面だけの形状です。通常のキートップ形状とは別に設定します",
    },
    topHatDishDepth: {
      label: "トップハットの深さ",
      cylindricalHint: "現在の範囲は {minDepth}〜{maxDepth} です。正値で一方向に凹み、負値で盛り上がります",
      sphericalHint: "現在の範囲は {minDepth}〜{maxDepth} です。正値で椀形に凹み、負値で球面状に盛り上がります",
      flatHint: "フラットでは効きません",
    },
    topHatTopWidth: {
      label: "上面の横幅",
      hint: "追加するキートップ上面の横幅です。現在の最大は {maxWidth} です",
      secondaryLabel: "上面サイズ",
      miniLabel: "横幅",
    },
    topHatTopDepth: {
      label: "上面の奥行き",
      hint: "追加するキートップ上面の前後寸法です。現在の最大は {maxDepth} です",
      secondaryLabel: "上面奥行きサイズ",
      miniLabel: "奥行き",
    },
    topHatBottomWidth: {
      label: "底面の横幅",
      hint: "追加するキートップ底面の横幅です。現在の最大は {maxWidth} です",
      secondaryLabel: "底面サイズ",
      miniLabel: "横幅",
    },
    topHatBottomDepth: {
      label: "底面の奥行き",
      hint: "追加するキートップ底面の前後寸法です。現在の最大は {maxDepth} です",
      secondaryLabel: "底面奥行きサイズ",
      miniLabel: "奥行き",
    },
    topHatInset: {
      label: "上面の縮め量",
      hint: "エンターキー上面の輪郭から内側へ縮める量です。現在の最大は {maxInset} です",
    },
    topHatTopRadius: {
      label: "上面のR",
      hint: "追加するキートップ上面の角丸です。現在の最大は {maxRadius} です",
    },
    topHatBottomRadius: {
      label: "底面のR",
      hint: "追加するキートップ底面の角丸です。現在の最大は {maxRadius} です",
    },
    topHatBottomRadiusIndividualEnabled: {
      label: "個別",
      hint: "オンにすると追加するキートップ底面の四隅のRを個別に調整できます",
    },
    topHatBottomRadiusLeftTop: {
      label: "底面左上R",
    },
    topHatBottomRadiusRightTop: {
      label: "底面右上R",
    },
    topHatBottomRadiusRightBottom: {
      label: "底面右下R",
    },
    topHatBottomRadiusLeftBottom: {
      label: "底面左下R",
    },
    topHatTopRadiusIndividualEnabled: {
      label: "個別",
      hint: "オンにすると追加するキートップ上面の四隅のRを個別に調整できます",
    },
    topHatTopRadiusLeftTop: {
      label: "左上R",
    },
    topHatTopRadiusRightTop: {
      label: "右上R",
    },
    topHatTopRadiusRightBottom: {
      label: "右下R",
    },
    topHatTopRadiusLeftBottom: {
      label: "左下R",
    },
    topHatHeight: {
      label: "高さ",
      hint: "既存のキートップ面から追加上面までの高さです。マイナスで凹ませます。現在の範囲は {minHeight} から {maxHeight} です",
    },
    topHatShoulderAngle: {
      label: "shoulder角度",
      hint: "追加上面から肩へ落ちる角度です。大きいほど肩が急になります",
    },
    topHatShoulderRadius: {
      label: "shoulder R",
      hint: "0 では角面、プラスで丸く膨らみ、マイナスで凹みます。現在の範囲は {minRadius} から {maxRadius} です",
    },
    rimEnabled: {
      label: "キーリムを付ける",
      hint: "キートップ外周を別パーツで覆います",
    },
    rimWidth: {
      label: "キーリムの幅",
      hint: "キートップ正面から見た帯の幅です。{maxWidth} で全面まで広がります",
    },
    rimHeightUp: {
      label: "上方向の高さ",
      hint: "0 で上面と面一です。プラスで上へ伸びます",
    },
    rimHeightDown: {
      label: "下方向の高さ",
      hint: "0 で下面と面一です。プラスで下へ伸びます",
    },
    rimColor: {
      label: "キーリムの色",
      hint: "カラーコードを直接入力するか、カラーピッカーで選べます",
    },
    topSlopeInputMode: {
      label: "傾きの入力方法",
      hint: "角度で入れるか、端の高さで入れるかを選びます",
    },
    topPitchDeg: {
      label: "手前から奥の傾斜",
      hint: "プラスで奥が高くなります。現在: 手前 {front} / 奥 {back}",
    },
    topRollDeg: {
      label: "左右の傾斜",
      hint: "プラスで右が高くなります。現在: 左 {left} / 右 {right}",
    },
    topFrontHeight: {
      label: "手前高さ",
      hint: "上面基準面の手前高さです。中央高さは固定され、現在の前後傾斜は {pitch} です",
    },
    topBackHeight: {
      label: "奥高さ",
      hint: "上面基準面の奥高さです。中央高さは固定され、現在の前後傾斜は {pitch} です",
    },
    topLeftHeight: {
      label: "左高さ",
      hint: "上面基準面の左高さです。中央高さは固定され、現在の左右傾斜は {roll} です",
    },
    topRightHeight: {
      label: "右高さ",
      hint: "上面基準面の右高さです。中央高さは固定され、現在の左右傾斜は {roll} です",
    },
    legendEnabled: {
      label: "キートップに印字を入れる",
      hint: "オフにすると文字を作りません",
    },
    legendPrintNotice: "プリンタやスライサーの精度によって、文字の大きさや太さ補正の調整が必要になることがあります。",
    legendText: {
      label: "入れる文字",
      hint: "複数文字をそのまま入力できます",
      placeholder: "A / Shift / あ",
    },
    legendContentType: {
      label: "印字の内容",
      hint: "文字を入れるか、アイコンを入れるかを選びます",
    },
    legendIconSet: {
      label: "アイコンセット",
      hint: "印字に使うアイコンセットを選びます",
    },
    legendIconName: {
      label: "アイコン",
      hint: "{set} の {count} 件から検索できます",
    },
    legendIconFill: {
      label: "アイコンを塗りつぶす",
      hint: "対応するアイコンではアウトラインと塗りつぶしを切り替えます",
    },
    legendFontKey: {
      label: "書体",
      staticHint: "虫眼鏡から検索できます",
      variableHint: "虫眼鏡から検索できます。対応 style は右側で選びます",
      userHint: "追加したマイフォントを使います。このブラウザ内だけに保持します",
      missingHint: "保存データが参照するマイフォントを再追加してください",
    },
    legendFontStyleKey: {
      label: "フォント内スタイル",
      selectableHint: "内蔵 style を使います",
      defaultHint: "フォント名どおりに使います",
    },
    legendUnderlineEnabled: {
      label: "下線を付ける",
      hint: "下線位置と太さは font ファイルの情報を使います。任意の見た目へ置き換えません",
    },
    legendSize: {
      label: "印字の大きさ",
      hint: "印字する文字またはアイコンの大きさを変更します。",
    },
    legendOutlineDelta: {
      label: "太さ補正",
      hint: "0 が元の輪郭です。プラスで太く、マイナスで細くします",
    },
    legendHeight: {
      label: "文字の高さ",
      hint: "0 は面一です。プラスで盛り上げ、マイナスで表面より下へ沈めます",
    },
    legendEmbed: {
      label: "内側への埋め込み",
      hint: "盛り上がる文字の根元をどれだけキートップ内部へ入れるかです。高さ 0 の場合は上面シェルの大半まで自動で埋め込みます",
    },
    legendColor: {
      label: "印字の色",
      hint: "カラーコードを直接入力するか、カラーピッカーで選べます",
    },
    legendOffsetX: {
      label: "左右の位置",
      hint: "文字を左右に動かします",
    },
    legendOffsetY: {
      label: "前後の位置",
      hint: "文字を前後に動かします",
    },
    sideLegend: {
      enabled: {
        label: "{side}サイドウォールに印字を入れる",
        hint: "オフにすると{side}の文字を作りません",
      },
      color: {
        label: "{side}の印字色",
        hint: "カラーコードを直接入力するか、カラーピッカーで選べます",
      },
      text: {
        label: "{side}に入れる文字",
        hint: "複数文字をそのまま入力できます",
      },
      contentType: {
        label: "{side}の印字内容",
        hint: "文字を入れるか、アイコンを入れるかを選びます",
      },
      iconSet: {
        label: "{side}のアイコンセット",
        hint: "印字に使うアイコンセットを選びます",
      },
      iconName: {
        label: "{side}のアイコン",
      },
      iconFill: {
        label: "{side}のアイコンを塗りつぶす",
        hint: "対応するアイコンではアウトラインと塗りつぶしを切り替えます",
      },
      fontKey: {
        label: "{side}の書体",
      },
      fontStyleKey: {
        label: "{side}のフォント内スタイル",
      },
      underlineEnabled: {
        label: "{side}に下線を付ける",
        hint: "下線位置と太さは font ファイルの情報を使います。任意の見た目へ置き換えません",
      },
      size: {
        label: "{side}の印字の大きさ",
        hint: "サイドウォールに印字する文字またはアイコンの大きさを変更します",
      },
      outlineDelta: {
        label: "{side}の太さ補正",
      },
      height: {
        label: "{side}の文字の高さ",
        hint: "0 はサイドウォールと面一です。プラスで外側へ盛り上げ、マイナスで内側へ沈めます",
      },
      offsetX: {
        label: "{side}の横位置",
        hint: "サイドウォール上で文字を左右に動かします",
      },
      offsetY: {
        label: "{side}の上下位置",
        hint: "サイドウォール上で文字を上下に動かします",
      },
    },
    homingBarEnabled: {
      label: "目印を付ける",
      hint: "指で位置を探しやすくします",
    },
    homingBarLength: {
      label: "目印の長さ",
      hint: "左右にどれくらい広げるかです",
    },
    homingBarWidth: {
      label: "目印の太さ",
      hint: "目印の見た目の太さです",
    },
    homingBarHeight: {
      label: "目印の高さ",
      hint: "表面からどれだけ出すかです",
    },
    homingBarChamfer: {
      label: "目印の面取り",
      hint: "小さい値では上端を軽く丸め、大きくすると半円状の山に近づきます",
    },
    homingBarOffsetY: {
      label: "目印の前後位置",
      hint: "目印を前後に動かします",
    },
    homingBarColor: {
      label: "目印の色",
      hint: "カラーコードを直接入力するか、カラーピッカーで選べます",
    },
    stemType: {
      label: "取り付け方式",
      hint: "キーキャップが合う軸の種類を選びます",
    },
    jStemLp01PreviewColor: {
      label: "プレビュー色",
      hint: "J-STEM-LP01 参照パーツの表示色を選びます",
    },
    stemOuterDelta: {
      label: "外周の補正",
      hint: "0 が標準です。プラスで外周円を太く、マイナスで細くします",
    },
    stemCrossMargin: {
      label: "はまりのゆとり",
      mxHint: "0 が標準です。プラスで十字穴を広げ、マイナスで狭めます",
      chocV1Hint: "0 が標準です。プラスで 2 本爪を細くして緩く、マイナスで太くしてきつくします",
      alpsHint: "0 が標準です。プラスで差し込み部を細くして緩く、マイナスで太くしてきつくします",
      jStemLp01Hint: "0.1 mm を初期値にしています。実物がきついときはプラスで、緩いときはマイナスで LP01 受け座の掘り込み外形を 0.02 mm 刻みで調整します",
      disabledHint: "取り付け部分を作らないときは使いません",
    },
    stemCrossChamfer: {
      label: "入口の面取り",
      hint: "0 が標準です。値を大きくすると十字穴入口だけを広げます",
      disabledHint: "十字ステム以外では使いません",
    },
    stemInsetDelta: {
      label: "軸の開始位置補正",
      hint: "0 が標準です。プラスで底面からの開始位置を上げ、マイナスで下へ伸ばします",
      jStemLp01Hint: "0 が標準です。値を大きくすると LP01 受け座の掘り込みを深くします",
      disabledHint: "取り付け部分を作らないときは使いません",
    },
  },
  options: {
    stemType: {
      none: "なし",
      mx: "MX 互換",
      choc_v1: "Choc v1",
      choc_v2: "Choc v2",
      alps: "Alps / Matias",
      j_stem_lp01: "J-STEM-LP01(試験的)",
    },
    jStemLp01PreviewColor: {
      clear: "クリア",
      white: "白",
      orange: "オレンジ",
    },
    topSurfaceShape: {
      flat: "フラット",
      cylindrical: "シンドリカル",
      spherical: "スフェリカル",
    },
    topSlopeInputMode: {
      angle: "角度で調整",
      "edge-height": "端の高さで調整",
    },
    legendContentType: {
      text: "文字",
      icon: "アイコン",
    },
    legendIconSet: {
      lucide: "Lucide",
      "material-symbols": "Material Symbols",
      "font-awesome": "Font Awesome Free Solid",
      "remix-icon": "Remix Icon",
    },
  },
  stemDescriptions: {
    none: "取り付け部分を作りません。外形や印字だけを確認したいとき向けです。",
    mx: "Cherry MX 互換の十字形状です。Cherry / Gateron / Kailh BOX など、一般的なメカニカルキーボード用の軸に合います。",
    choc_v1: "Kailh Choc v1 用の 2 本爪形状です。薄型キーボード向けの Choc v1 軸に合います。",
    alps: "Alps / Matias 系の差し込み形状です。対応する Alps 系の軸に合います。",
    choc_v2: "Kailh Choc v2 用の十字形状です。Choc v2 軸に合う取り付け部分を作ります。",
    j_stem_lp01: "J-STEM-LP01 と組み合わせるため、キーキャップ裏側のステム設置面へ LP01 上面の受け座を掘り込みます。試験的な設定です。",
  },
  sideLabels: {
    front: "前面",
    back: "背面",
    left: "左側",
    right: "右側",
  },
  font: {
    defaultStyleLabel: "フォント名どおり",
    searchAriaLabel: "フォントを検索",
    searchDialogLabel: "フォント検索",
    searchPlaceholder: "フォント名で検索",
    segmentControlLabel: "フォントの種類",
    builtinFontsSegment: "組み込みフォント",
    myFontsSegment: "マイフォント",
    noResults: "一致するフォントがありません",
    variableMeta: "Variable / named style",
    staticMeta: "Static face",
    userMeta: "マイフォント",
    remoteMeta: "CDNフォント",
    missingMeta: "マイフォント未読み込み",
    addLocalFont: "ローカルフォントを追加",
    addLocalFontHint: "TTF / OTF を選択",
    addCdnFont: "CDN / embedから追加",
    addCdnFontHint: "Google Fonts、CSS、TTF / OTF URL",
    cdnFontUrlLabel: "CDN / embedから追加",
    sourceModeLabel: "入力の種類",
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
      googleFonts: "Google Fonts の @import または <link> を貼り付けます。",
      cssUrl: "font-face を返す CSS ファイルの URL を貼り付けます。",
      fontFace: "@font-face CSS をそのまま貼り付けます。TTF / OTF の src を使います。",
      fontFile: "CORS で取得できる TTF / OTF ファイルの直リンクを貼り付けます。",
    },
    addMissingLocalFont: "同じフォントを追加",
    noLocalFontFile: "TTF / OTF フォントファイルが見つかりません。",
    noFontSourceUrl: "CDN / embed URL を入力してください。",
    unsupportedLocalFont: "{fileName} は対応していないフォント形式です。TTF / OTF を選択してください。",
    emptyLocalFont: "{fileName} は空のフォントファイルです。",
    localTitle: "ローカルフォント",
    localBody: "{fileName}{byteLength} をこのブラウザ内で使っています。プロジェクト ZIP や JSON にはフォント本体を同梱しません。",
    remoteTitle: "CDNフォント",
    remoteBody: "取得元: {source}",
    missingTitle: "マイフォントが未読み込みです",
    missingBody: "保存データが参照するフォント本体はこのブラウザにありません。同じ TTF / OTF を追加すると復元できます。",
    deleteLocalFont: "削除",
    localFontMultipleLabel: "マイフォント {count} 件",
    localFontAdded: "{font} をマイフォントに追加しました",
    localFontsAdded: "マイフォントを {count} 件追加しました",
    localFontDeleted: "{font} をマイフォントから削除しました",
    remoteFontAdded: "{font} をCDNからマイフォントに追加しました",
    localFontLoadLabel: "マイフォント追加",
    localFontLoadNote: "{font} をブラウザ内のマイフォントへ追加",
    localFontLoadFailed: "マイフォントの追加に失敗しました",
    localFontLoadFailedLabel: "マイフォント追加失敗",
    remoteFontLoadLabel: "CDNフォント追加",
    remoteFontLoadNote: "{source} から {font} を追加",
    remoteFontLoadFailed: "CDNフォントの追加に失敗しました",
    remoteFontLoadFailedLabel: "CDNフォント追加失敗",
    landingPageLinkLabel: "フォントページを開く",
    landingPageLinkAriaLabel: "{font} のページ {page} を新しいタブで開く",
    attributionTitle: "著作権・ライセンス表記",
    attributions: {
      "kurobara-cinderella-regular": [
        "使用フォント: 黒薔薇シンデレラ Version 1.00.20180805",
        "著作権表示: Copyright(c) 2017 M+ FONTS PROJECT/MODI",
        "ライセンス表記: This font is free software. Unlimited permission is granted to use, copy, and distribute it, with or without modification, either commercially or noncommercially. THIS FONT IS PROVIDED \"AS IS\" WITHOUT WARRANTY.",
        "派生元ライセンス: SIL Open Font License, Version 1.1",
        "配布ページ: https://modi.jpn.org/font_kurobara-cinderella.php"
      ],
    },
  },
  icons: {
    searchAriaLabel: "アイコンを検索",
    searchDialogLabel: "アイコン検索",
    searchPlaceholder: "アイコン名で検索",
    noResults: "一致するアイコンがありません",
    recommendedLabel: "キーキャップ向け候補",
    searchResultsLabel: "検索結果",
    attributionTitle: "アイコンの著作権・ライセンス表記",
    openCatalog: "{set}で探す",
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
    body: "本体",
    topHat: "トップハット",
    rim: "キーリム",
    legend: "印字",
    topLegend: "{position}",
    sideLegend: "{side}サイド印字",
    homing: "目印",
    jStemLp01: "J-STEM-LP01",
  },
  preview: {
    placeholder: "まだ見た目を表示していません。設計を変えると自動で最新の形に更新されます。",
    running: "見た目を更新しています",
    successSingle: "見た目の更新が完了しました。{parts}を表示しています。",
    successMultiple: "見た目の更新が完了しました。{parts}を色ごとに分けて表示しています。",
    failed: "見た目の更新に失敗しました",
    summary: "{elapsedMs} ms / {objectCount} objects / {vertexCount} vertices / {faceCount} triangles",
  },
  status: {
    notGenerated: "未生成",
    dirty: "入力内容を反映待ち",
    loadedDirty: "読み込んだ編集データを反映待ち",
  },
  importExport: {
    copied: "クリップボードへコピーしました（{byteLength} バイト）",
    copiedBase64: "Base64 としてクリップボードへコピーしました（{byteLength} バイト）",
    copyLabel: "クリップボードへコピー",
    copyFailed: "クリップボードへコピーできませんでした",
    copyFailedLabel: "コピー失敗",
    copyTextNote: "{characters} 文字をテキストとしてコピーしました",
    copyBase64Note: "Base64 {characters} 文字をコピーしました。デコードするとファイルに戻せます。",
    loaded: "編集データを読み込みました ({fileName})",
    loadLabel: "編集データ読込",
    loadNote: "{fileName} を現在の編集内容へ反映",
    loadNoteWithUnbound: "{fileName} を現在の編集内容へ反映。反映できなかったパラメータ {count} 件を表示しています。",
    noJsonFile: "JSON ファイルが見つかりません。",
    loadFailed: "編集データの読み込みに失敗しました",
    loadFailedLabel: "編集データ読込失敗",
    preparing: "保存データを準備しています",
    savedEditorData: "編集データを保存しました ({byteLength} bytes)",
    editorDataLabel: "編集データ JSON",
    editorDataNote: "画面で編集するパラメータを JSON 形式で保存",
    savedThreeMf: "3MFデータを保存しました ({byteLength} bytes / {partCount} 個のパーツ)",
    threeMfLabel: "3MFデータ",
    threeMfNote: "{parts}を 3MF 形式でまとめて保存",
    savedStep: "STEPを保存しました ({byteLength} bytes)",
    stepLabel: "単一形状 STEP",
    stepNote: "単一形状を STEP faceted B-rep として保存 ({faceCount} faces)",
    savedStl: "STLを保存しました ({byteLength} bytes)",
    stlLabel: "単色 STL",
    stlNote: "色と印字を含めず、単一メッシュの形状として保存",
    saveFailed: "保存に失敗しました",
    saveFailedLabel: "保存失敗",
    unsupportedExport: "未対応の export 形式です: {format}",
  },
  errors: {
    appRootMissing: "#app が見つかりません。",
    colorisLoadFailed: "Coloris の読み込みに失敗しました。",
    unsupportedOffPurpose: "未対応の OFF ジョブ用途です: {purpose}",
  },
  format: {
    listSeparator: "、",
  },
});

export default ja;
