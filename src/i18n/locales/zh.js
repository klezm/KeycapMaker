const zh = Object.freeze({
  language: {
    label: "LANGUAGE",
    ariaLabel: "选择显示语言",
    listLabel: "语言选项",
    options: {
    keysetLayout: {
      "iso-105": "ISO 105 键（全尺寸）",
      "ansi-104": "ANSI 104 键（全尺寸）",
    },
    keysetLanguage: {
      de: "德语",
      us: "英语（美国）",
      gb: "英语（英国）",
      fr: "法语",
      es: "西班牙语",
      it: "意大利语",
      ru: "俄语",
      gr: "希腊语",
      il: "希伯来语",
    },
      ja: "日本語",
      en: "English",
      zh: "中文",
      ko: "한국어",
    },
  },
  theme: {
    ariaLabel: "选择显示模式",
    options: {
      light: "浅色模式",
      dark: "深色模式",
    },
  },
  navigation: {
    label: "工作区部分",
    project: "项目",
    design: "设计",
    export: "导出",
    keyset: "键帽套装",
  },
  actions: {
    back: "返回",
    close: "关闭",
    choose: "选择",
    copy: "复制",
    copied: "已复制",
    on: "开启",
    off: "关闭",
    saving: "正在保存...",
  },
  dropOverlay: {
    title: "拖放项目 / JSON / 字体",
    body: "读取项目、已保存的编辑数据、兼容输入 JSON，或 TTF / OTF 字体。",
    chip: "ZIP / JSON / TTF / OTF",
  },
  importReport: {
    title: "JSON 读取报告",
    unboundBody: "{fileName} 中有 {count} 个参数无法应用到当前形状，已跳过。",
    unboundListLabel: "已跳过的参数",
    expand: "展开 JSON 读取报告",
    collapse: "折叠 JSON 读取报告",
    more: "另有 {count} 个",
    deleteParam: "从 JSON 中删除 {path}",
  },
  panels: {
    project: {
      title: "项目",
      body: "将多个键帽保存在一起，并从列表切换当前编辑对象。",
    },
    design: {
      title: "设计",
      body: "可以根据输入调整所选键帽形状和字符，并自动在右侧更新预览。",
    },
    export: {
      title: "导出",
      body: "可以保存用于打印的 3MF / STEP / STL 数据，以及稍后继续编辑用的 JSON。",
    },
    keyset: {
      title: "键帽套装",
      body: "一次渲染整块键盘的键帽，可使用一种或两种语言，并导出为单个 3MF 文件。",
    },
  },
  keyset: {
    settingsTitle: "布局与语言",
    buildTitle: "构建",
    exportTitle: "导出",
    layout: {
      label: "键盘布局",
      hint: "要生成的物理按键排列。",
    },
    primaryLanguage: {
      label: "主要语言",
      hint: "每个键帽上的主要字符。",
    },
    secondaryLanguage: {
      label: "次要语言",
      hint: "位于右下角的第二种文字的小号字符。",
    },
    secondaryNone: "无",
    shineThrough: {
      label: "透光字符",
      hint: "将字符完全切穿顶面，让背光透出。请使用半透明材料打印嵌件。",
    },
    build: "构建键帽套装",
    cancel: "取消",
    exportBody: "导出上方已渲染的键帽，无需再次等待。",
    exportBoard: "3MF（键盘布局）",
    exportGrid: "3MF（打印板）",
    statusPreparing: "正在准备 {count} 个键帽…",
    statusRendering: "正在渲染第 {done} / {total} 个部件…",
    statusReady: "完成：{count} 个键帽（{summary}）。",
    statusCancelled: "已取消构建。",
    statusFailed: "构建失败。",
    statusStale: "设置已更改。请构建键帽套装。",
    statusExported: "已导出 {count} 个键帽。",
  },
  mobileInspector: {
    hide: "将设计卡片移到上方",
    show: "恢复设计卡片",
  },
  exportPanel: {
    jsonChip: "可继续编辑的 JSON",
    jsonTitle: "保存编辑数据",
    jsonBody: "将形状、尺寸、颜色和字符保存为 JSON。之后可以通过拖放再次读取。",
    saveJson: "保存 JSON",
    threeMfChip: "打印用 3MF",
    threeMfTitle: "保存 3MF 数据",
    threeMfBody: "将包含本体、定位标记和字符的打印用数据汇总保存为 3MF 格式。",
    saveThreeMf: "保存 3MF",
    stepChip: "CAD 交换用 STEP",
    stepTitle: "保存 STEP",
    stepBody: "将单一形状保存为 STEP/AP214 faceted B-rep。不包含颜色、字符和部件分离。需要 CAD 交接或制造要求使用 STEP 时使用。",
    saveStep: "保存 STEP",
    optionsTitle: "选项",
    optionsBody: "普通打印数据推荐使用 3MF。CAD 交接使用 STEP，只需要简单网格时使用 STL。",
    optionsExpand: "展开选项",
    optionsCollapse: "折叠选项",
    stlChip: "单色 STL",
    stlTitle: "保存 STL",
    stlBody: "保存为单一材料、单一网格的 STL。颜色和字符会被忽略，只导出形状。如果需要颜色区分或字符，请保存为 3MF。",
    saveStl: "保存 STL",
  },
  project: {
    nameTitle: "项目名称",
    nameLabel: "项目名称",
    nameHint: "用于 ZIP 根目录和项目 manifest 的名称",
    keycapsTitle: "键帽列表",
    keycapsCount: "{count} 项",
    empty: "还没有键帽。",
    addCurrent: "添加正在编辑键帽的副本",
    recapturePreview: "重新拍摄 {name} 的预览",
    previewRecaptured: "已重新拍摄预览",
    reorderKeycap: "更改 {name} 的显示顺序",
    selectKeycap: "编辑 {name}",
    activeKeycap: "编辑中",
    exportAction: "导出",
    exportKeycap: "导出 {name}",
    exportChip: "键帽导出",
    exportTitle: "导出 {name}",
    designAction: "设计",
    designKeycap: "{name} 的设计",
    designChip: "键帽设计",
    designTitle: "{name} 的设计",
    deleteChip: "删除",
    deleteTitle: "删除键帽",
    deleteBody: "将此键帽从项目列表中删除。",
    deleteLastBody: "项目必须至少包含一个键帽，因此无法删除此键帽。",
    deleteAction: "删除",
    save: "保存项目",
    edited: "正在编辑项目",
    added: "已将 {name} 添加到项目",
    deleted: "已从项目中删除 {name}",
    reordered: "已更改键帽列表的显示顺序",
    loadedKeycap: "已切换到 {name}",
    loaded: "已读取项目 {name}（{count} 项）",
    saving: "正在保存项目",
    saved: "已保存项目",
    saveFailed: "项目保存失败: {message}",
    directoryNotWritable: "无法写入此目录。",
    previewDecodeFailed: "无法将预览图转换为保存数据。",
    invalidPath: "项目内路径无效: {path}",
    missingProjectFile: "找不到项目内文件: {path}",
  },
  nameGroup: {
    title: "名称",
    description: "保存时使用的名称。3MF、STEP、STL 和编辑数据 JSON 都会使用它，之后读取时也会保留。",
  },
  parameterGroupCaptions: {
    name: "导出文件名",
    top: "上表面与倾斜",
    topHat: "追加键顶",
    legend: "字符与位置",
  },
  unitBasis: {
    title: "1u 换算",
    description: "当前按 {unitBase} mm 显示为 1u。",
    fieldLabel: "1u 基准",
    fieldHint: "用于窄间距换算。模型尺寸不会改变",
    readout: "当前尺寸: 宽度 {widthUnits}u / 深度 {depthUnits}u",
  },
  fieldGroup: {
    expand: "展开{title}",
    collapse: "折叠{title}",
  },
  legendCards: {
    center: "中央字符",
    rightTop: "右上字符",
    rightBottom: "右下字符",
    leftTop: "左上字符",
    leftBottom: "左下字符",
    keytop: "键顶",
    sidewall: "{side}侧壁",
  },
  stemCards: {
    clearance: "间隙",
  },
  shapeProfiles: {
    "custom-shell": {
      label: "自定义外壳",
      fieldGroups: {
        shape: {
          title: "键帽形状",
          description: "调整键帽整体尺寸、上表面中心高度、向顶部收窄的程度、顶边 R 和本体肩部 R。宽度和深度都按 {unitBase} mm = 1u 换算。",
        },
        top: {
          title: "键顶",
          description: "可切换平面 / 圆柱 / 球面，并调整前后和左右倾斜。切换为边缘高度输入时，内部仍会规范化为 pitch / roll。",
        },
        topHat: {
          title: "Top Hat",
          description: "调整在现有键顶上追加的小型上表面，包括启用状态、顶面 / 底面尺寸、R、高度和肩部角度。",
        },
        legend: {
          title: "字符",
          description: "集中调整键顶多个位置和侧壁上的文字、字体、外观、位置和凸起高度。也可以直接输入多个字符。",
        },
        homing: {
          title: "手指定位标记",
          description: "调整类似 F 键和 J 键上的触感凸起。可与字符分开设置。",
        },
        stem: {
          title: "安装部",
        },
      },
    },
    typewriter: {
      label: "打字机",
      fieldGroups: {
        shape: {
          title: "键帽形状",
          description: "调整打字机风格的薄键顶外形和厚度。宽度和深度都按 {unitBase} mm = 1u 换算；R 越大越圆，越小越接近方形。",
        },
        top: {
          title: "键顶",
          description: "可用角度或边缘高度编辑前后和左右倾斜。边缘高度输入在内部会规范化为 pitch / roll。",
        },
        legend: {
          title: "字符",
          description: "集中调整键顶多个位置和侧壁上的文字、字体、外观、位置和凸起高度。也可以直接输入多个字符。",
        },
        homing: {
          title: "手指定位标记",
          description: "调整类似 F 键和 J 键上的触感凸起。可与字符分开设置。",
        },
        stem: {
          title: "安装部",
        },
      },
    },
    "jis-enter": {
      label: "JIS Enter",
      fieldGroups: {
        shape: {
          title: "键帽形状",
          description: "以常见 JIS / ISO 系纵向 Enter 轮廓为基准，调整整体尺寸、上表面中心高度、左下缺口、顶边 R 和本体肩部 R。宽度和深度都按 {unitBase} mm = 1u 换算。",
        },
        top: {
          title: "键顶",
          description: "与自定义外壳一样，可调整平面 / 圆柱 / 球面，以及前后和左右倾斜。",
        },
        topHat: {
          title: "Top Hat",
          description: "调整从 JIS Enter 键顶外形向内避让后追加的上表面，包括启用状态、R、高度和肩部角度。",
        },
        legend: {
          title: "字符",
          description: "集中调整键顶多个位置和侧壁上的文字、字体、外观、位置和凸起高度。也可以直接输入多个字符。",
        },
        homing: {
          title: "手指定位标记",
          description: "调整类似 F 键和 J 键上的触感凸起。可与字符分开设置。",
        },
        stem: {
          title: "安装部",
        },
      },
    },
    "typewriter-jis-enter": {
      label: "打字机 JIS Enter",
      fieldGroups: {
        shape: {
          title: "键帽形状",
          description: "以打字机风格的薄型 JIS Enter 轮廓为基准，调整整体尺寸、键顶厚度、左下缺口和 R。宽度和深度都按 {unitBase} mm = 1u 换算。",
        },
        top: {
          title: "键顶",
          description: "与打字机形状一样，可调整边框、前后和左右倾斜以及安装基准高度。",
        },
        legend: {
          title: "字符",
          description: "集中调整键顶多个位置和侧壁上的文字、字体、外观、位置和凸起高度。也可以直接输入多个字符。",
        },
        homing: {
          title: "手指定位标记",
          description: "调整类似 F 键和 J 键上的触感凸起。可与字符分开设置。",
        },
        stem: {
          title: "安装部",
        },
      },
    },
  },
  fieldGroups: {
    shapeDescriptionShell: "调整键帽整体尺寸、上表面中心高度、向顶部收窄的程度、顶边 R 和本体肩部 R。宽度和深度都按 {unitBase} mm = 1u 换算。",
    shapeDescriptionTypewriter: "调整打字机风格的薄键顶外形和厚度。宽度和深度都按 {unitBase} mm = 1u 换算；R 越大越圆，越小越接近方形。",
    topDescription: "可用角度或边缘高度编辑前后和左右倾斜。边缘高度输入在内部会规范化为 pitch / roll。",
  },
  fields: {
    name: {
      label: "名称",
      hint: "用于 3MF、STEP、STL 和编辑数据 JSON 的保存文件名",
    },
    shapeProfile: {
      label: "基础形状",
      hint: "选择要使用的基本形状",
    },
    keyWidth: {
      label: "宽度",
      hint: "宽度与键尺寸联动。{unitBase} mm = 1u。",
      secondaryLabel: "键尺寸",
      miniLabel: "宽度",
    },
    keyDepth: {
      label: "深度",
      hint: "深度与深度尺寸联动。{unitBase} mm = 1u。",
      secondaryLabel: "深度尺寸",
      miniLabel: "深度",
    },
    wallThickness: {
      label: "壁厚",
      hint: "分别设置侧壁与键顶的材料厚度",
      primaryMiniLabel: "侧壁",
      secondaryLabel: "键顶",
    },
    topThickness: {
      label: "键顶厚度",
      hint: "键顶上表面下方保留的材料厚度",
    },
    typewriterCornerRadius: {
      label: "R",
      hint: "{maxRadius} 时为圆形，接近 0 mm 时边角更尖。",
    },
    topCornerRadius: {
      label: "上面 R",
      hint: "同时圆化键顶上表面的四个角。当前最大值为 {maxRadius}。",
    },
    topCornerRadiusIndividualEnabled: {
      label: "分别调整",
      hint: "开启后可分别调整四个角的 R。",
    },
    topCornerRadiusLeftTop: {
      label: "左上 R",
    },
    topCornerRadiusRightTop: {
      label: "右上 R",
    },
    topCornerRadiusRightBottom: {
      label: "右下 R",
    },
    topCornerRadiusLeftBottom: {
      label: "左下 R",
    },
    jisEnterNotchWidth: {
      label: "缺口宽度",
      hint: "左下缺口的横向宽度。最大 {maxWidth}。",
    },
    jisEnterNotchDepth: {
      label: "缺口深度",
      hint: "左下缺口的前后方向深度。最大 {maxDepth}。",
    },
    topScale: {
      label: "顶部收窄",
      hint: "数值越小，顶部会在保持宽度和深度比例的同时收窄",
    },
    keycapEdgeRadius: {
      label: "顶边 R",
      hint: "圆化键顶与侧壁之间的过渡。0 mm 保持当前的平面折角。当前最大值为 {maxRadius}。",
    },
    keycapShoulderRadius: {
      label: "肩部 R",
      hint: "调整键帽本体肩部：0 保持平面折角，正值向外圆鼓，负值向内凹。当前范围为 {minRadius} 到 {maxRadius}。",
    },
    bodyColor: {
      label: "本体颜色",
      hint: "可直接输入颜色代码，或使用颜色选择器",
    },
    topCenterHeight: {
      label: "上表面中心高度",
      typewriterLabel: "键顶厚度",
      hint: "添加 dish 前的键顶中心。当前中心表面为 {height}。",
      typewriterHint: "薄键顶从底部到上表面的厚度",
    },
    topOffset: {
      label: "键顶中心偏移",
      hint: "安装部位置不变，只将键顶中心左右 / 前后移动",
    },
    topOffsetX: {
      label: "左右偏移",
      hint: "安装部位置不变，只将键顶中心左右移动",
    },
    topOffsetY: {
      label: "前后偏移",
      hint: "安装部位置不变，只将键顶中心前后移动",
    },
    typewriterMountHeight: {
      label: "以上表面为基准的高度",
      hint: "从键顶本体上表面中心到安装部下端的距离。当前最小值为 {minHeight}。",
    },
    topSurfaceShape: {
      label: "键顶形状",
      hint: "平面为平坦表面，圆柱为单方向弯曲，球面为全方向弯曲",
    },
    dishDepth: {
      label: "深度",
      cylindricalHint: "当前范围为 {minDepth} 至 {maxDepth}。正值形成单方向凹陷，负值形成凸起。",
      sphericalHint: "当前范围为 {minDepth} 至 {maxDepth}。正值形成碗状凹陷，负值形成球面凸起。",
      flatHint: "平面时此项不起作用。",
    },
    topHatEnabled: {
      label: "添加 Top Hat",
      hint: "在现有键顶上添加一个可独立设置形状的小键顶。",
    },
    topHatSeparateColorEnabled: {
      label: "与本体分色",
      hint: "开启后将 top hat 作为单独部件输出，并可单独设置颜色。",
    },
    topHatColor: {
      label: "Top Hat 颜色",
      hint: "可直接输入颜色代码，或使用颜色选择器",
    },
    topHatSurfaceShape: {
      label: "Top Hat 形状",
      hint: "仅用于 top hat 上表面的形状，与普通键顶形状独立设置。",
    },
    topHatDishDepth: {
      label: "Top Hat 深度",
      cylindricalHint: "当前范围为 {minDepth} 至 {maxDepth}。正值让 top hat 上表面形成单方向凹陷，负值形成凸起。",
      sphericalHint: "当前范围为 {minDepth} 至 {maxDepth}。正值形成碗状凹陷，负值形成球面凸起。",
      flatHint: "平面时此项不起作用。",
    },
    topHatTopWidth: {
      label: "上面宽度",
      hint: "追加键顶上表面的宽度。当前最大值为 {maxWidth}。",
      secondaryLabel: "上面尺寸",
      miniLabel: "宽度",
    },
    topHatTopDepth: {
      label: "上面深度",
      hint: "追加键顶上表面的前后尺寸。当前最大值为 {maxDepth}。",
      secondaryLabel: "上面深度尺寸",
      miniLabel: "深度",
    },
    topHatBottomWidth: {
      label: "底面宽度",
      hint: "追加键顶底面的宽度。当前最大值为 {maxWidth}。",
      secondaryLabel: "底面尺寸",
      miniLabel: "宽度",
    },
    topHatBottomDepth: {
      label: "底面深度",
      hint: "追加键顶底面的前后尺寸。当前最大值为 {maxDepth}。",
      secondaryLabel: "底面深度尺寸",
      miniLabel: "深度",
    },
    topHatInset: {
      label: "上面内缩量",
      hint: "从 Enter 键顶轮廓向内缩小的距离。当前最大值为 {maxInset}。",
    },
    topHatTopRadius: {
      label: "上面 R",
      hint: "追加键顶上表面的圆角。当前最大值为 {maxRadius}。",
    },
    topHatBottomRadius: {
      label: "底面 R",
      hint: "追加键顶底面的圆角。当前最大值为 {maxRadius}。",
    },
    topHatBottomRadiusIndividualEnabled: {
      label: "分别调整",
      hint: "开启后可分别调整追加键顶底面四个角的 R。",
    },
    topHatBottomRadiusLeftTop: {
      label: "底面左上 R",
    },
    topHatBottomRadiusRightTop: {
      label: "底面右上 R",
    },
    topHatBottomRadiusRightBottom: {
      label: "底面右下 R",
    },
    topHatBottomRadiusLeftBottom: {
      label: "底面左下 R",
    },
    topHatTopRadiusIndividualEnabled: {
      label: "分别调整",
      hint: "开启后可分别调整追加键顶上表面四个角的 R。",
    },
    topHatTopRadiusLeftTop: {
      label: "左上 R",
    },
    topHatTopRadiusRightTop: {
      label: "右上 R",
    },
    topHatTopRadiusRightBottom: {
      label: "右下 R",
    },
    topHatTopRadiusLeftBottom: {
      label: "左下 R",
    },
    topHatHeight: {
      label: "高度",
      hint: "从现有键顶面到追加上表面的高度。负值会向下凹陷。当前范围为 {minHeight} 到 {maxHeight}。",
    },
    topHatShoulderAngle: {
      label: "shoulder 角度",
      hint: "从追加上表面向肩部下降的角度。数值越大肩部越陡。",
    },
    topHatShoulderRadius: {
      label: "shoulder R",
      hint: "0 为折面；正值使肩部圆滑外凸，负值使肩部内凹。当前范围为 {minRadius} 到 {maxRadius}。",
    },
    rimEnabled: {
      label: "添加键圈",
      hint: "用单独部件覆盖键顶外周",
    },
    rimWidth: {
      label: "键圈宽度",
      hint: "从键顶正面看到的带状宽度。{maxWidth} 时会扩展到整个表面。",
    },
    rimHeightUp: {
      label: "向上高度",
      hint: "0 表示与上表面齐平。正值会向上延伸。",
    },
    rimHeightDown: {
      label: "向下高度",
      hint: "0 表示与下表面齐平。正值会向下延伸。",
    },
    rimColor: {
      label: "键圈颜色",
      hint: "可直接输入颜色代码，或使用颜色选择器",
    },
    topSlopeInputMode: {
      label: "倾斜输入方式",
      hint: "选择用角度输入，或用边缘高度输入",
    },
    topPitchDeg: {
      label: "前后倾斜",
      hint: "正值会抬高后侧。当前: 前 {front} / 后 {back}",
    },
    topRollDeg: {
      label: "左右倾斜",
      hint: "正值会抬高右侧。当前: 左 {left} / 右 {right}",
    },
    topFrontHeight: {
      label: "前侧高度",
      hint: "上表面基准面的前侧高度。中心高度固定，当前前后倾斜为 {pitch}。",
    },
    topBackHeight: {
      label: "后侧高度",
      hint: "上表面基准面的后侧高度。中心高度固定，当前前后倾斜为 {pitch}。",
    },
    topLeftHeight: {
      label: "左侧高度",
      hint: "上表面基准面的左侧高度。中心高度固定，当前左右倾斜为 {roll}。",
    },
    topRightHeight: {
      label: "右侧高度",
      hint: "上表面基准面的右侧高度。中心高度固定，当前左右倾斜为 {roll}。",
    },
    legendEnabled: {
      label: "添加键顶字符",
      hint: "关闭后不会生成文字形状",
    },
    legendPrintNotice: "根据打印机和切片软件的精度，可能需要调整文字大小或粗细补正。",
    legendText: {
      label: "输入字符",
      hint: "可以直接输入多个字符",
      placeholder: "A / Shift / あ",
    },
    legendContentType: {
      label: "字符内容",
      hint: "选择使用文字还是图标。",
    },
    legendIconSet: {
      label: "图标集",
      hint: "选择用于字符的图标集。",
    },
    legendIconName: {
      label: "图标",
      hint: "可搜索 {count} 个 {set} 图标。",
    },
    legendIconFill: {
      label: "填充图标",
      hint: "所选图标支持时，可切换轮廓和填充样式。",
    },
    legendFontKey: {
      label: "字体",
      staticHint: "可通过放大镜搜索",
      variableHint: "可通过放大镜搜索。支持的 style 在右侧选择。",
      userHint: "使用此浏览器中添加的我的字体",
      missingHint: "请重新添加已引用的我的字体",
    },
    legendFontStyleKey: {
      label: "字体内样式",
      selectableHint: "使用内置 style",
      defaultHint: "按字体名称默认方式使用",
    },
    legendUnderlineEnabled: {
      label: "添加下划线",
      hint: "下划线位置和粗细使用 font 文件中的信息，不会替换为任意外观。",
    },
    legendSize: {
      label: "字符/图标大小",
      hint: "更改字符或图标的大小。",
    },
    legendOutlineDelta: {
      label: "粗细补正",
      hint: "0 为原始轮廓。正值变粗，负值变细。",
    },
    legendHeight: {
      label: "文字高度",
      hint: "0 为齐平。正值会凸起，负值会下沉到表面以下。",
    },
    legendEmbed: {
      label: "向内嵌入",
      hint: "凸起文字根部进入键顶内部的距离。高度为 0 时会自动嵌入到上表面壳体的大部分。",
    },
    legendColor: {
      label: "字符颜色",
      hint: "可直接输入颜色代码，或使用颜色选择器",
    },
    legendOffsetX: {
      label: "左右位置",
      hint: "左右移动文字",
    },
    legendOffsetY: {
      label: "前后位置",
      hint: "前后移动文字",
    },
    sideLegend: {
      enabled: {
        label: "在{side}侧壁添加字符",
        hint: "关闭后不会生成{side}侧的文字形状",
      },
      color: {
        label: "{side}字符颜色",
        hint: "可直接输入颜色代码，或使用颜色选择器",
      },
      text: {
        label: "{side}输入字符",
        hint: "可以直接输入多个字符",
      },
      contentType: {
        label: "{side}字符内容",
        hint: "选择使用文字还是图标。",
      },
      iconSet: {
        label: "{side}图标集",
        hint: "选择用于字符的图标集。",
      },
      iconName: {
        label: "{side}图标",
      },
      iconFill: {
        label: "填充{side}图标",
        hint: "所选图标支持时，可切换轮廓和填充样式。",
      },
      fontKey: {
        label: "{side}字体",
      },
      fontStyleKey: {
        label: "{side}字体内样式",
      },
      underlineEnabled: {
        label: "为{side}添加下划线",
        hint: "下划线位置和粗细使用 font 文件中的信息，不会替换为任意外观。",
      },
      size: {
        label: "{side}字符/图标大小",
        hint: "更改侧壁字符或图标的大小。",
      },
      outlineDelta: {
        label: "{side}粗细补正",
      },
      height: {
        label: "{side}文字高度",
        hint: "0 为与侧壁齐平。正值会向外凸起，负值会向内下沉。",
      },
      offsetX: {
        label: "{side}横向位置",
        hint: "在侧壁上左右移动文字",
      },
      offsetY: {
        label: "{side}纵向位置",
        hint: "在侧壁上上下移动文字",
      },
    },
    homingBarEnabled: {
      label: "添加定位标记",
      hint: "让手指更容易找到位置",
    },
    homingBarLength: {
      label: "定位标记长度",
      hint: "左右扩展的距离",
    },
    homingBarWidth: {
      label: "定位标记宽度",
      hint: "定位标记外观上的粗细",
    },
    homingBarHeight: {
      label: "定位标记高度",
      hint: "从表面凸起的高度",
    },
    homingBarChamfer: {
      label: "定位标记倒角",
      hint: "较小值会轻微圆化上缘，较大值会接近半圆形凸脊。",
    },
    homingBarOffsetY: {
      label: "定位标记前后位置",
      hint: "前后移动定位标记",
    },
    homingBarColor: {
      label: "定位标记颜色",
      hint: "可直接输入颜色代码，或使用颜色选择器",
    },
    stemType: {
      label: "安装方式",
      hint: "选择键帽适配的轴体类型",
    },
    jStemLp01PreviewColor: {
      label: "预览颜色",
      hint: "选择 J-STEM-LP01 参考件的显示颜色",
    },
    stemOuterDelta: {
      label: "外周补正",
      hint: "0 为标准值。正值会加粗外周圆，负值会变细。",
    },
    stemCrossMargin: {
      label: "配合余量",
      mxHint: "0 为标准值。正值会扩大十字孔，负值会收紧。",
      chocV1Hint: "0 为标准值。正值会让两个爪更细更松，负值会让其更粗更紧。",
      alpsHint: "0 为标准值。正值会让插入部更细更松，负值会让其更粗更紧。",
      jStemLp01Hint: "初始值为 0.1 mm。实物过紧时增大，过松时减小，以 0.02 mm 步进调整 LP01 承接凹槽外形。",
      disabledHint: "不生成安装部时不使用",
    },
    stemCrossChamfer: {
      label: "入口倒角",
      hint: "0 为标准值。增大该值只会扩大十字孔入口。",
      disabledHint: "非十字安装部不使用",
    },
    stemInsetDelta: {
      label: "轴部起始位置补正",
      hint: "0 为标准值。正值会从底面抬高起始位置，负值会向下延伸。",
      jStemLp01Hint: "0 为标准值。增大该值会加深 LP01 承接凹槽。",
      disabledHint: "不生成安装部时不使用",
    },
  },
  options: {
    stemType: {
      none: "无",
      mx: "MX 兼容",
      choc_v1: "Choc v1",
      choc_v2: "Choc v2",
      alps: "Alps / Matias",
      j_stem_lp01: "J-STEM-LP01（实验）",
    },
    jStemLp01PreviewColor: {
      clear: "透明",
      white: "白色",
      orange: "橙色",
    },
    topSurfaceShape: {
      flat: "平面",
      cylindrical: "圆柱",
      spherical: "球面",
    },
    topSlopeInputMode: {
      angle: "按角度调整",
      "edge-height": "按边缘高度调整",
    },
    legendContentType: {
      text: "文字",
      icon: "图标",
    },
    legendIconSet: {
      lucide: "Lucide",
      "material-symbols": "Material Symbols",
      "font-awesome": "Font Awesome Free Solid",
      "remix-icon": "Remix Icon",
    },
  },
  stemDescriptions: {
    none: "不生成安装部。适合只检查外形或字符时使用。",
    mx: "Cherry MX 兼容的十字形状。适配 Cherry / Gateron / Kailh BOX 等常见机械键盘轴。",
    choc_v1: "Kailh Choc v1 用的双爪形状。适配使用 Choc v1 轴的薄型键盘。",
    alps: "Alps / Matias 系的插入形状。适配对应的 Alps 系轴体。",
    choc_v2: "Kailh Choc v2 用的十字形状。生成适配 Choc v2 轴的安装部。",
    j_stem_lp01: "在键帽背面的轴安装面切出 LP01 顶面承接凹槽，以便与 J-STEM-LP01 组合使用。此设置为实验性。",
  },
  sideLabels: {
    front: "前面",
    back: "背面",
    left: "左侧",
    right: "右侧",
  },
  font: {
    defaultStyleLabel: "按字体默认",
    searchAriaLabel: "搜索字体",
    searchDialogLabel: "字体搜索",
    searchPlaceholder: "按字体名称搜索",
    segmentControlLabel: "字体来源",
    builtinFontsSegment: "内置字体",
    myFontsSegment: "我的字体",
    noResults: "没有匹配的字体",
    variableMeta: "可变 / 命名样式",
    staticMeta: "静态字形",
    userMeta: "我的字体",
    remoteMeta: "CDN 字体",
    missingMeta: "我的字体未读取",
    addLocalFont: "添加本地字体",
    addLocalFontHint: "选择 TTF / OTF",
    addCdnFont: "从 CDN / embed 添加",
    addCdnFontHint: "Google Fonts、CSS 或 TTF / OTF URL",
    cdnFontUrlLabel: "从 CDN / embed 添加",
    sourceModeLabel: "输入类型",
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
      googleFonts: "粘贴 Google Fonts 的 @import 或 <link> 片段。",
      cssUrl: "粘贴返回 font-face 规则的 CSS 文件 URL。",
      fontFace: "直接粘贴 @font-face CSS。src 需要解析到 TTF / OTF。",
      fontFile: "粘贴允许 CORS fetch 的 TTF / OTF 文件直链。",
    },
    addMissingLocalFont: "添加相同字体",
    noLocalFontFile: "未找到 TTF / OTF 字体文件。",
    noFontSourceUrl: "请输入 CDN / embed URL。",
    unsupportedLocalFont: "{fileName} 不是受支持的字体格式。请选择 TTF / OTF。",
    emptyLocalFont: "{fileName} 是空的字体文件。",
    localTitle: "本地字体",
    localBody: "正在此浏览器中使用 {fileName}{byteLength}。项目 ZIP 或 JSON 不会包含字体文件本体。",
    remoteTitle: "CDN 字体",
    remoteBody: "来源: {source}",
    missingTitle: "我的字体未读取",
    missingBody: "此保存数据引用的字体文件不在此浏览器中。添加相同的 TTF / OTF 即可恢复。",
    deleteLocalFont: "删除",
    localFontMultipleLabel: "我的字体 {count} 个",
    localFontAdded: "已将 {font} 添加到我的字体",
    localFontsAdded: "已添加 {count} 个我的字体",
    localFontDeleted: "已从我的字体中删除 {font}",
    remoteFontAdded: "已从 CDN 将 {font} 添加到我的字体",
    localFontLoadLabel: "添加我的字体",
    localFontLoadNote: "已将 {font} 添加到浏览器内的我的字体",
    localFontLoadFailed: "添加我的字体失败",
    localFontLoadFailedLabel: "添加我的字体失败",
    remoteFontLoadLabel: "添加 CDN 字体",
    remoteFontLoadNote: "已从 {source} 添加 {font}",
    remoteFontLoadFailed: "添加 CDN 字体失败",
    remoteFontLoadFailedLabel: "添加 CDN 字体失败",
    landingPageLinkLabel: "打开字体页面",
    landingPageLinkAriaLabel: "在新标签页打开 {font} 的 {page}",
    attributionTitle: "版权与许可标注",
    attributions: {
      "kurobara-cinderella-regular": [
        "使用字体: 黒薔薇シンデレラ Version 1.00.20180805",
        "版权标注: Copyright(c) 2017 M+ FONTS PROJECT/MODI",
        "许可标注: This font is free software. Unlimited permission is granted to use, copy, and distribute it, with or without modification, either commercially or noncommercially. THIS FONT IS PROVIDED \"AS IS\" WITHOUT WARRANTY.",
        "派生源许可: SIL Open Font License, Version 1.1",
        "发布页面: https://modi.jpn.org/font_kurobara-cinderella.php"
      ],
    },
  },
  icons: {
    searchAriaLabel: "搜索图标",
    searchDialogLabel: "图标搜索",
    searchPlaceholder: "按图标名称搜索",
    noResults: "没有匹配的图标",
    recommendedLabel: "键帽常用候选",
    searchResultsLabel: "搜索结果",
    attributionTitle: "图标版权与许可标注",
    openCatalog: "浏览 {set}",
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
    topHat: "Top Hat",
    rim: "键圈",
    legend: "字符",
    topLegend: "{position}",
    sideLegend: "{side}侧面字符",
    homing: "定位标记",
    jStemLp01: "J-STEM-LP01",
  },
  preview: {
    placeholder: "尚未显示预览。更改设计后会自动更新为最新形状。",
    running: "正在更新预览",
    successSingle: "预览更新完成。正在显示{parts}。",
    successMultiple: "预览更新完成。正在按颜色分开显示{parts}。",
    failed: "预览更新失败",
    summary: "{elapsedMs} ms / {objectCount} objects / {vertexCount} vertices / {faceCount} triangles",
  },
  status: {
    notGenerated: "未生成",
    dirty: "等待应用输入内容",
    loadedDirty: "等待应用已读取的编辑数据",
  },
  importExport: {
    loaded: "已读取编辑数据 ({fileName})",
    loadLabel: "编辑数据读取",
    loadNote: "已将 {fileName} 应用到当前编辑内容",
    loadNoteWithUnbound: "已将 {fileName} 应用到当前编辑内容。正在显示 {count} 个已跳过的参数。",
    noJsonFile: "未找到 JSON 文件。",
    loadFailed: "读取编辑数据失败",
    loadFailedLabel: "编辑数据读取失败",
    preparing: "正在准备保存数据",
    savedEditorData: "已保存编辑数据 ({byteLength} bytes)",
    editorDataLabel: "编辑数据 JSON",
    editorDataNote: "将画面中可编辑的参数保存为 JSON 格式",
    savedThreeMf: "已保存 3MF 数据 ({byteLength} bytes / {partCount} 个部件)",
    threeMfLabel: "3MF 数据",
    threeMfNote: "已将{parts}汇总保存为 3MF 格式",
    savedStep: "已保存 STEP ({byteLength} bytes)",
    stepLabel: "单一形状 STEP",
    stepNote: "已将单一形状保存为 STEP faceted B-rep ({faceCount} faces)",
    savedStl: "已保存 STL ({byteLength} bytes)",
    stlLabel: "单色 STL",
    stlNote: "不包含颜色和字符，作为单一网格形状保存",
    saveFailed: "保存失败",
    saveFailedLabel: "保存失败",
    unsupportedExport: "不支持的 export 格式: {format}",
  },
  errors: {
    appRootMissing: "找不到 #app。",
    colorisLoadFailed: "Coloris 读取失败。",
    unsupportedOffPurpose: "不支持的 OFF 作业用途: {purpose}",
  },
  format: {
    listSeparator: "、",
  },
});

export default zh;
