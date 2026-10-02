# -*- coding: utf-8 -*-
"""
Generate a professional, styled Word (.docx) document for the Starfall Quiz Game Walkthrough (Stages 1-12).
"""

import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_walkthrough_doc(output_path):
    doc = Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)

    # Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Microsoft JhengHei'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = RGBColor(30, 41, 59) # Slate 800

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(12)
    p_title.paragraph_format.space_after = Pt(4)
    run_title = p_title.add_run("《星隕戰機：成語星際征途》\n1～12 關完整遊戲通關全攻略")
    run_title.font.name = 'Microsoft JhengHei'
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(14, 116, 144) # Cyan 700

    # Subtitle / Metadata
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(16)
    run_sub = p_sub.add_run("版本：v1.46 (BUILD-048) ｜ 平台：Web / Mobile 全設備 ｜ 核心特色：成語教育 ✕ 肉鴿彈幕 ✕ 雲端同步")
    run_sub.font.name = 'Microsoft JhengHei'
    run_sub.font.size = Pt(9.5)
    run_sub.font.color.rgb = RGBColor(100, 116, 139)

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Microsoft JhengHei'
        run.font.size = Pt(15)
        run.font.bold = True
        run.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Microsoft JhengHei'
        run.font.size = Pt(12.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(3, 105, 161) # Cyan 700
        return p

    def add_bullet(text, bold_prefix=""):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.2
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.font.name = 'Microsoft JhengHei'
            r_pre.font.bold = True
            r_pre.font.color.rgb = RGBColor(15, 23, 42)
        r_text = p.add_run(text)
        r_text.font.name = 'Microsoft JhengHei'
        return p

    # --- Section 1 ---
    add_h1("一、核心戰鬥機制與系統全解析")
    add_bullet("標準關卡循環為：Wave 1～3 雜兵機隊巡航 ➔ Wave 4 神話機神 Boss 戰 ➔ 成語考核 5 題 ➔ 整備升級與超武合成。", "關卡推進結構：")
    add_bullet("戰機主動開火無需手動按鍵；滑鼠/觸控可自由拖曳自機微操避彈。", "自機操作特點：")
    add_bullet("自機擦過敵彈邊緣可累積 Graze 擦彈計量，加快被動冷卻並提高總評分。", "擦彈系統（Graze）：")
    add_bullet("鍵盤 B 或點擊右下角按鈕，瞬間清除全屏敵彈並獲得 1.5 秒無敵。", "核爆緊急避險（Bomb）：")
    add_bullet("全場累積答對 > 40 題且最高連對 >= 20 題時，升級時保底抽取 1 款 S 級神兵！", "S 級神兵解鎖條件：")
    add_bullet("答題時若答錯，系統將停用自動倒數，排版呈現【正確解答】、【答案解析】與【記憶要訣】，由玩家點擊「下一題 ➔」掌握節奏。", "全新答錯提示機制：")
    add_bullet("歷史錯題若二度答錯，結算評級將額外扣減 1 題懲罰。", "防重複答錯懲罰：")

    # --- Section 2 ---
    add_h1("二、六大 T0 級超級融合武器配方")
    table_data = [
        ["超武名稱", "配方組件 (皆需 Rank 3)", "定位", "專屬效果與實戰威力"],
        ["彗星靈丸", "靈丸 + 重型榴彈發射器", "主砲爆發", "命中引爆連續 5 次核爆，留下 4 秒空間烈焰，清場輸出之王。"],
        ["虹晶天幕", "高能光束砲 + 稜鏡僚機", "主砲穿透", "光束穿透僚機折射成 6 束交織雷射網，無視防護盾直接貫穿本體。"],
        ["軌道壁壘", "青玉飛輪 + 埃癸斯神盾", "副武防禦", "飛輪每消 5 顆敵彈即縮短護盾冷卻 1 秒，反彈敵彈轉化為護盾能量。"],
        ["熔核轟擊", "重型榴彈 + 奇點重力核心", "副武聚怪", "著彈形成微型黑洞熔爐，將周圍敵彈全部吸扯並瞬間引爆。"],
        ["蜂群獵手", "追蹤導彈 + 戰鬥僚機", "輔助巡航", "僚機改裝微型蜂巢，主機開火時同步傾瀉 8 枚巡弋導彈自動索敵。"],
        ["凝時裁決", "高能光束砲 + 時之沙漏", "輔助控時", "光束擊發時全場敵機與彈幕強制減速 40%，微操新手必備。"]
    ]

    t = doc.add_table(rows=len(table_data), cols=4)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_widths = [Inches(1.2), Inches(1.8), Inches(1.0), Inches(2.7)]

    for row_idx, row in enumerate(table_data):
        for col_idx, val in enumerate(row):
            cell = t.cell(row_idx, col_idx)
            cell.width = col_widths[col_idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_margins(cell, top=120, bottom=120, left=150, right=150)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            run = p.add_run(val)
            run.font.name = 'Microsoft JhengHei'
            if row_idx == 0:
                set_cell_background(cell, '0891B2') # Cyan 600
                run.font.bold = True
                run.font.size = Pt(10)
                run.font.color.rgb = RGBColor(255, 255, 255)
            else:
                run.font.size = Pt(9.5)
                bg_color = 'F8FAFC' if row_idx % 2 == 1 else 'FFFFFF'
                set_cell_background(cell, bg_color)
                if col_idx == 0:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(14, 116, 144)

    # --- Section 3 ---
    add_h1("三、第 1～12 關逐關深度攻防攻略")

    stages_info = [
        {
            "num": 1,
            "name": "始源空域・庫巴城堡",
            "boss": "【機甲庫巴・烈焰暴君】（HP: 16,000）",
            "feature": "經典蘑菇王國空戰，作為初學者入門教學關卡。",
            "ult": "【機甲庫巴・烈焰風暴】：漫天噴射巨型烈焰火球與扇形散射彈。",
            "tips": [
                "庫巴在噴火前有長達 2 秒的頭部搖晃前搖，將戰機拉至左右兩側 45 度角輸出即可避開主火柱。",
                "推薦首發選擇「多向散彈」或「光束砲」，15 秒左右即可輕鬆擊破。"
            ]
        },
        {
            "num": 2,
            "name": "荒野神廟・古代試煉",
            "boss": "【莫力布林巨將】(HP: 10,000) ＆ 【災厄加儂・終焉狂瀾】(HP: 28,000)",
            "feature": "薩爾達荒野風格雙 Boss 關卡，古代席卡科技與怨念雷射。",
            "ult": "【災厄加儂・魔怨狂瀾】：古代怨念雷射矩陣與爆裂暗核。",
            "tips": [
                "先鋒莫力布林施放「巨棒猛擊」前地面有 1.5 秒紅圈預警，迅速垂直後拉遠離衝擊波。",
                "加儂釋放怨念雷射時會提前在屏幕上投射紅色軌道線，紅線鎖定後保持勻速橫移即可安全避開。"
            ]
        },
        {
            "num": 3,
            "name": "裂空之巔・金羽天峰",
            "boss": "【迦樓羅・裂空王】（HP: 50,400）",
            "feature": "金黑機械神鳥，二階段自帶【金羽天罡神盾】（10,000 HP 護盾，破盾癱瘓 1.8 秒）。",
            "ult": "【金羽裂空・天罰降臨】正弦金羽瀑布；【滅世羽嵐】滯空 3 秒定時引爆金羽；【暴風神喙】兩側風牆封鎖戰場。",
            "tips": [
                "二階段務必集火神盾，破盾後的 1.8 秒癱瘓是貼臉爆發輸出的黃金窗口。",
                "滯空金羽引爆前閃爍加劇，戰機待在屏幕底線中央尋找羽毛空隙小幅度穿梭。"
            ]
        },
        {
            "num": 4,
            "name": "震霄九天・雷神星雲",
            "boss": "【雷公・震霄】（HP: 56,700）",
            "feature": "高壓磁暴天頂，二階段附加【磁暴靜電拘束】（每隔 3 秒強制使戰機定身 0.5 秒）。",
            "ult": "【雷鼓震天・五芒破界】五芒星雷射矩陣；【十連絕滅】天頂驚雷十連劈；【雷暴核心超載】高壓環狀電弧。",
            "tips": [
                "牢記每 3 秒一次的定身節奏！即將定身前 0.5 秒切勿冒險鑽彈，預先停留在開闊安全區。",
                "天頂驚雷十連劈有明顯垂直亮線預警，以「單方向勻速平移」引導雷柱落於身後。"
            ]
        },
        {
            "num": 5,
            "name": "迷石廢墟・深淵蛇鏡",
            "boss": "【美杜莎・返照】（HP: 65,100）",
            "feature": "石化古殿，二階段開啟【美杜莎之眸】（石化凝視使玩家移動速度永久下降 50%）。",
            "ult": "【萬蛇凝視・石化神光】扇形石化光束與環形反射彈；【顧影自憐・蛇鏡天幕】分身折射光網；【深淵石化射線】半屏紫色光錐。",
            "tips": [
                "移速被削半極度考驗微操，強烈建議本關前合成出「軌道壁壘」或點滿護盾防禦冷卻。",
                "蛇鏡折射光網角度固定，戰機待在屏幕左右兩側底角的鏡面反射死角最為安全。"
            ]
        },
        {
            "num": 6,
            "name": "暴食深淵・巨艦星骸",
            "boss": "【饕餮・萬喰】（HP: 175,000）",
            "feature": "巨口母艦，腹部核心產生持續【黑洞引力坍縮】，不斷將戰機往 Boss 口中拉扯。",
            "ult": "【黑洞引力・貪婪坍縮】引力暴增 + 毒濁流；【萬獸狂食】召喚傀儡回血；【暴食狂宴】地面留存高溫熔岩領域。",
            "tips": [
                "戰機隨時維持反向推進力抵抗黑洞吸扯，避免撞上 Boss 碰撞箱。",
                "地面生成熔岩領域時立即升至中高空作戰；出現暴食傀儡時必須第一時間轉火殲滅。"
            ]
        },
        {
            "num": 7,
            "name": "重力泰坦・群星傾覆",
            "boss": "【阿特拉斯・墜星】（HP: 195,000）",
            "feature": "重力巨神，血量極厚且彈幕具備巨型破片分裂機制。",
            "ult": "【泰坦重壓・地動山搖】全屏碎屑震顫；【群星墜落】巨型引力隕石擴散；【墜星天罰】隕石半空殉爆分裂為 16 枚破片。",
            "tips": [
                "16 枚破片在剛爆開時密度最高，切勿在半空隕石核心周圍停留。",
                "待破片向外呈扇形均勻擴散後，在空隙處直線後退即可安全穿越。"
            ]
        },
        {
            "num": 8,
            "name": "聖裁衛城・極性神殿",
            "boss": "【雅典娜・神盾】（HP: 215,000）",
            "feature": "極性神盾機神，週期性切換防護極性，並召喚浮游砲環繞齊射。",
            "ult": "【固若金湯・聖裁之盾】無敵金盾；【長槍貫日】全屏貫穿長槍；【智慧法陣・聖光十字誅絕】金色雙十字星環擴散。",
            "tips": [
                "聖裁之盾展開時 Boss 處於超高免傷狀態，需優先清理四枚浮游砲以破除護盾。",
                "雙十字法陣預警時間為 2.8 秒，交叉十字中心傷害致命，迅速撤往四個邊角象限。"
            ]
        },
        {
            "num": 9,
            "name": "毒沼要塞・死灰復生",
            "boss": "【許德拉・再生】（HP: 235,000）",
            "feature": "多首再生要塞，具備極強的再生能力與全域酸液腐蝕。",
            "ult": "【九首死靈・毒沼暴湧】九首齊射墨綠光束；【萬毒弒神】蛇首分裂游移獵殺；【九首齊鳴】正弦交叉波浪覆蓋全場。",
            "tips": [
                "正弦交叉波浪看似封死全屏，實則在波峰與波谷交匯處存在天然安全孔隙。",
                "蛇首分裂游移獵殺時，保持沿屏幕邊緣作長方形繞場移動，不可停滯在死角。"
            ]
        },
        {
            "num": 10,
            "name": "天爐星核・巨神熔爐",
            "boss": "【獨眼巨人・天爐】（HP: 255,000）",
            "feature": "熔爐獨眼機神，具備致命的 360 度環場掃蕩與垂直地脈熔火噴發。",
            "ult": "【天爐神火・睚眥熔射】瞬時鎖定軸線雷射；【赫菲斯托斯・滅世掃蕩】360 度掃射；【巨神重錘】地面噴發四道垂直熔火柱。",
            "tips": [
                "360 度滅世掃蕩光束旋轉時，戰機必須順著旋轉方向圓周繞圈；走位不及立即按 B 交出 Bomb。",
                "垂直地脈火柱噴發前地表有明顯熔岩氣泡預警，橫向移開 1 個機身寬度即可。"
            ]
        },
        {
            "num": 11,
            "name": "幻霧幽冥・天狐迷蹤",
            "boss": "【玉藻前・幻械】（HP: 240,000）",
            "feature": "九尾天狐機神，召喚殺生石共鳴法陣與四具殘影分身，彈幕真假交錯。",
            "ult": "【九尾妖火・媚影迷蹤】殘影齊射穿甲光束；【殺生石封】全域魅惑螺旋彈幕；【殺生結界】八面魅影幽冥光刃。",
            "tips": [
                "真身頭部狐火的光暈最明亮，且命中時上方總血條會扣減；切勿把火力浪費在殺生石虛體上。",
                "魅惑螺旋彈飛行速度緩慢，採取「小幅度菱形微操」比直線後退更容易避開。"
            ]
        },
        {
            "num": 12,
            "name": "宇宙無極・創世終焉（最終決戰）",
            "boss": "【提亞瑪特・混沌母艦】（HP: 480,000，擁有 3 階段變身）",
            "feature": "創世混沌巨龍，全場戰鬥分為三大階段，擁有雙黑洞引力、幼龍孵化與十字空間裂解。",
            "ult": "【原初黑潮】九色混沌彈幕；【萬龍孵化】幼龍群齊射；【維度坍縮黑星】雙黑洞；【創世終焉・萬象歸虛】全屏十字毀滅星光。",
            "tips": [
                "Phase 1 (100%~60% HP)：保持在底端 1/3 位置，利用「虹晶天幕」或「彗星靈丸」全力削血。",
                "Phase 2 (60%~30% HP)：待在雙黑洞的中垂線平衡位置；幼龍孵化後立即使用範圍超武一網打盡。",
                "Phase 3 (30%~0% HP 狂暴)：十字毀滅裂縫覆蓋全屏，僅有屏幕最底角兩端存在極微小安全死角。此時果斷交出所有保留的 Bomb 與超武，全力爆發達成通關！"
            ]
        }
    ]

    for st in stages_info:
        add_h2(f"第 {st['num']} 關：{st['name']}")
        add_bullet(st['boss'], "領主名號：")
        add_bullet(st['feature'], "關卡特色：")
        add_bullet(st['ult'], "大招機制：")
        for tip in st['tips']:
            add_bullet(tip, "戰術應對：")

    # --- Section 4 ---
    add_h1("四、成語題庫（Quiz Phase）滿分通關心法")
    add_bullet("「目無全牛」（技藝純熟精湛，非盲目自大）、「差強人意」（大體上令人滿意，非表現極差）、「明日黃花」（過時事物，非美好明天）。", "結構型辨析（褒貶義易混淆）：")
    add_bullet("「緣木求魚」（方法錯誤徒勞無功）、「南轅北轍」（行動與目標背道而馳）。", "行動與目的矛盾題型：")
    add_bullet("答錯題目時不要急躁，新版系統已停用倒數跳題，請詳讀【正確解答】、【答案解析】與【記憶要訣】，記住關鍵字即可避免二度答錯扣分。", "善用答錯從容閱讀機制：")
    add_bullet("只要保持平穩節奏，前 8 關累計答對 40 題且維持 20 題連勝，後續關卡即可常態手握 S 級神器，輕鬆通關 12 關！", "穩拿 S 級神兵戰略：")

    # --- Section 5 ---
    add_h1("五、教育雲端架構與家長後台報表")
    add_bullet("標準 8 欄設計（關卡、題號、題目、選項 1～4、正確解答、解析短評、記憶要訣）。", "Questions（題庫總表）：")
    add_bullet("詳細記載學生學號、姓名、挑戰關卡、題號、題目、選擇的答案（含選項文字）、正確答案、是否答對與作答秒數。", "Attempts（作答紀錄明細）：")
    add_bullet("自動彙整各關卡總作答數、正確率%、平均答題秒數與學習評級，讓師長與家長一目了然掌握孩子學習曲線。", "ParentDashboard（家長學習總覽）：")

    doc.save(output_path)
    print(f"Document successfully created at: {output_path}")

if __name__ == '__main__':
    project_dir = r"C:\Users\何任軒\Desktop\Antigravity\starfall-quiz"
    docx_path = os.path.join(project_dir, "星隕戰機_成語星際征途_1-12關完整通關攻略.docx")
    create_walkthrough_doc(docx_path)
