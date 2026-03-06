<template>
  <div class="container">
    <div class="header">
      <div class="brand">
        <div class="title">House Rules Builder</div>
        <div class="subtitle">
          多步向导填写条款，生成规范化纯文字文书（段落 + 编号），并导出 PDF。
        </div>
      </div>
      <div class="badgeRow">
        <div class="badge">进度：<b>{{ active + 1 }}</b>/{{ stepLabels.length }}</div>
        <div class="badge">草稿：<b>{{ hasDraft ? "存在" : "无" }}</b></div>
      </div>
    </div>

    <div class="mainGrid">
      <!-- 左侧：向导表单 -->
      <div class="panel">
        <div class="panelHead">
          <div class="h">
            文书配置向导
            <small>按步骤填写，随时可保存草稿、预览 PDF、导出 JSON。</small>
          </div>
          <div class="miniTools actionBar">
            <el-button size="small" @click="saveDraft">保存草稿</el-button>
            <el-button size="small" @click="loadDraft">加载草稿</el-button>
            <el-button size="small" @click="importJson">导入 JSON</el-button>
            <el-button size="small" type="primary" @click="loadExample">加载示例</el-button>
            <el-button size="small" type="danger" plain @click="clearDraft">清空草稿</el-button>
          </div>
        </div>
        <div class="panelBody">
          <div class="stepNav">
            <div
              v-for="(t,i) in stepLabels"
              :key="t"
              class="stepPill"
              :class="{ on: i===active, done: i<active }"
              @click="setActive(i)"
            >
              <span class="n">{{ i+1 }}</span>
              <span class="t">{{ t }}</span>
            </div>
          </div>

          <div class="navRow stickyNav">
            <div class="navLeft">
              <el-button @click="prev" :disabled="active===0">上一步</el-button>
              <el-button type="primary" @click="next" :disabled="active===stepLabels.length-1">下一步</el-button>
            </div>
            <div class="navRight">
              <el-button @click="previewPdf">预览 PDF</el-button>
            </div>
          </div>

          <div class="hr"></div>

          <!-- Step 0 -->
          <section v-show="active===0">
            <h3 class="stepTitle">步骤 1  模式与称呼体系</h3>
            <p class="stepHint">选择模式以自动填充称呼（后续可修改）。</p>
            <el-radio-group v-model="state.mode" size="large">
              <el-radio-button label="solo">自我监督</el-radio-button>
              <el-radio-button label="together">双方视角</el-radio-button>
            </el-radio-group>

            <div class="hr"></div>

            <el-form label-position="top" :model="state.base" :rules="rulesBase" ref="baseRef">
              <div class="row2">
                <el-form-item :label="state.mode==='solo' ? '称呼' : '甲方称呼'" prop="partyA">
                  <el-input v-model="state.base.partyA" placeholder="例如：甲方（监督方）"></el-input>
                </el-form-item>
                <el-form-item v-if="state.mode==='together'" label="乙方称呼" prop="partyB">
                  <el-input v-model="state.base.partyB" placeholder="例如：乙方（执行方）"></el-input>
                </el-form-item>
              </div>
            </el-form>
          </section>

          <!-- Step 1 -->
          <section v-show="active===1">
            <h3 class="stepTitle">步骤 2  原则与底线</h3>
            <p class="stepHint">此处内容会出现在文书开头，用于明确边界与终止机制。</p>

            <el-form label-position="top" :model="state.base" :rules="rulesBase" ref="baseRef2">


              <el-form-item label="安全词（红灯词）" prop="safeword">
                <el-input v-model="state.base.safeword" placeholder="例如：红灯 / 停止"></el-input>
              </el-form-item>

              <el-form-item label="硬性边界（至少一条，建议每行一条）" prop="hardLimitsText">
                <el-input
                  v-model="state.base.hardLimitsText"
                  type="textarea"
                  :rows="4"
                  placeholder="每行一条。例如：不得在公共场合执行纠正；出现不适立即停止；不在情绪失控时执行。"
                />
              </el-form-item>

              <el-form-item label="关怀与复盘">
                <el-select
                  v-model="state.base.aftercare"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  placeholder="可自定义（回车确认）"
                  style="width:100%"
                >
                  <el-option v-for="o in aftercareOptions" :key="o" :label="o" :value="o"></el-option>
                </el-select>
              </el-form-item>

              <el-form-item>
                <el-checkbox v-model="state.base.sscAccepted">
                  加入原则声明：本协议基于自愿与可控原则；任何一方均可随时停止执行。
                </el-checkbox>
              </el-form-item>
            </el-form>
          </section>
          <!-- Step 2 -->
          <section v-show="active===2">
            <h3 class="stepTitle">步骤 3  主体信息</h3>
            <p class="stepHint">这些信息会出现在文书页眉与签署区，用于标识版本与日期。</p>

            <el-form label-position="top" :model="state.base" :rules="rulesSubject" ref="subjectRef">
              <el-form-item label="文书标题" prop="title">
                <el-input v-model="state.base.title" placeholder="例如：家规与自律协议"></el-input>
              </el-form-item>

              <el-form-item label="签订日期" prop="date">
                <el-date-picker
                  v-model="state.base.date"
                  type="date"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width:100%"
                ></el-date-picker>
              </el-form-item>
            </el-form>
          </section>

          <!-- Step 2 -->

          <!-- Step 3 -->
          <section v-show="active===3">
            <h3 class="stepTitle">步骤 4  通用库（先建库）</h3>
            <p class="stepHint">用于补充通用执行细则，避免条款重复描述。</p>

            <el-form label-position="top" :model="state.kit">
              <el-form-item label="通用方式/手段（可多选，可自定义）">
                <el-select
                  v-model="state.kit.methods"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  placeholder="回车添加"
                  style="width:100%"
                >
                  <el-option v-for="o in kitMethodOptions" :key="o" :label="o" :value="o"></el-option>
                </el-select>
              </el-form-item>

              <el-form-item label="通用流程（建议：开始前确认，结束后复盘）">
                <el-input v-model="state.kit.process" type="textarea" :rows="4"
                  placeholder="例如：执行前确认状态与边界；执行后补水休息；24小时内做一次复盘总结。"
                />
              </el-form-item>

              <el-form-item label="非身体类纠正">
                <el-select
                  v-model="state.kit.nonPhysical"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  placeholder="回车添加"
                  style="width:100%"
                >
                  <el-option v-for="o in nonPhysicalOptions" :key="o" :label="o" :value="o"></el-option>
                </el-select>
              </el-form-item>
            </el-form>
          </section>
          <section v-show="active===4">
            <h3 class="stepTitle">步骤 5  主体条款（引用通用库）</h3>
            <p class="stepHint">先建类别，再为类别添加条款。条款结构化后便于自动编号输出。</p>

            <div class="toolbar">
              <el-button type="primary" @click="openCatDialog">新增类别</el-button>
              <el-button @click="useCategoryTemplates">加载常用类别模板</el-button>
            </div>

            
            <div v-if="state.categories.length" class="catList">
              <div v-for="(c,idx) in state.categories" :key="c.id" class="catItem" :class="{active: activeCatIndex===idx}" @click="selectCategory(idx)">
                <div class="t1">{{ c.title }}</div>
                <div class="t2">条款：{{ c.rules.length }} 条</div>
                <button class="delCircle" title="删除类别" @click.stop="removeCategory(idx)">×</button>
              </div>
            </div>
            <div v-else class="emptyHint">暂无类别</div>


            <div class="hr"></div>

            <div v-if="activeCatIndex>-1" class="subBlock">
              <div class="subHead">
                <div>
                  <div class="subTitle">当前类别：{{ state.categories[activeCatIndex].title }}</div>
                  <div class="subHint">在右侧预览中会自动编号为“二、X”。</div>
                </div>
                <el-button type="primary" @click="openRuleDialog">新增条款</el-button>
              </div>

              <div v-if="state.categories[activeCatIndex].rules.length===0" class="emptyHint">
                当前类别暂无条款，请先新增一条。
              </div>

              <div v-for="(r,idx) in state.categories[activeCatIndex].rules" :key="r.id" class="ruleItem">
                <div class="ruleTop">
                  <div class="ruleTitle">{{ idx+1 }}. {{ r.desc }}</div>
                  <div class="ruleOps">
                    <el-button size="small" @click="editRule(idx)">编辑</el-button>
                    <el-button size="small" type="danger" plain @click="removeRule(idx)">删除</el-button>
                  </div>
                </div>
                <div class="ruleMeta">
                  <div><b>判定：</b>{{ r.criteria || "（未填写）" }}</div>
                  <div><b>审查周期：</b>{{ r.reviewCycle }}；<b>允许减免：</b>{{ r.allowRemit ? "是" : "否" }}</div>
                  <div class="tierBox">
                    <b>梯度：</b>
                    <div v-for="t in r.tiers" :key="t.level" class="tierLine">
                      <span class="tierL">{{ t.level }}</span>
                      <span class="tierT">{{ t.text }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="emptyHint">请先选择一个类别进入编辑。</div>
          </section>

          <!-- Step 4 -->
          <section v-show="active===5">
            <h3 class="stepTitle">步骤 6  奖励与正向强化</h3>
            <p class="stepHint">建议填写，用于形成完整的正向机制。</p>

            <div class="toolbar">
              <el-button @click="addRewardTemplate">一键模板</el-button>
              <el-button type="primary" @click="openRewardDialog">新增奖励</el-button>
            </div>

            <el-table :data="state.rewards" style="width:100%" empty-text="暂无奖励条款">
              <el-table-column label="触发条件" min-width="220">
                <template #default="{row}">
                  <div class="t1">{{ row.when }}</div>
                </template>
              </el-table-column>
              <el-table-column label="奖励/解锁" min-width="280">
                <template #default="{row}">
                  <div class="t2">{{ row.then }}</div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" align="right">
                <template #default="{row,$index}">
                  <el-button size="small" @click="editReward($index)">编辑</el-button>
                  <el-button size="small" type="danger" plain @click="removeReward($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <!-- Step 5 -->
          <section v-show="active===6">
            <h3 class="stepTitle">步骤 7  审查、修改与终止</h3>
            <p class="stepHint">用于控制版本迭代与失效机制。</p>

            <el-form label-position="top" :model="state.review">
              <el-form-item label="审查周期">
                <el-select v-model="state.review.cycle" style="width:100%">
                  <el-option label="每日" value="每日"></el-option>
                  <el-option label="每周" value="每周"></el-option>
                  <el-option label="每月" value="每月"></el-option>
                  <el-option label="每季度" value="每季度"></el-option>
                </el-select>
              </el-form-item>

              <el-form-item label="修改方式">
                <el-input v-model="state.review.modify" type="textarea" :rows="3"
                  placeholder="例如：需双方确认后更新版本，旧版归档。"
                />
              </el-form-item>

              <el-form-item label="终止条件">
                <el-input v-model="state.review.terminate" type="textarea" :rows="3"
                  placeholder="例如：任一方提出停止即终止；或到期自动失效。"
                />
              </el-form-item>

              <el-form-item label="备注">
                <el-input v-model="state.review.notes" type="textarea" :rows="4"
                  placeholder="任何补充说明。"
                />
              </el-form-item>
            </el-form>
          </section>

          <!-- Step 6 -->
          <section v-show="active===7">
            <h3 class="stepTitle">步骤 8  预览与导出</h3>
            <p class="stepHint">右侧为 PDF 预览。生成后可下载 PDF，或导出 JSON 备份。</p>

            <div class="toolbar">
              <el-button type="primary" @click="buildPdf">生成/刷新 PDF</el-button>
              <el-button :disabled="!pdfUrl" @click="downloadPdf">下载 PDF</el-button>
              <el-button @click="exportJson">导出 JSON</el-button>
            </div>

            <div class="noteBox">
              <b>校验：</b>安全词必填；硬性边界至少一条；至少一条家规条款；原则确认需勾选。
            </div>
          </section>
        </div>
      </div>

      <!-- 右侧：PDF预览 -->
      <div class="panel rightSticky" ref="previewPanelRef">
        <div class="panelHead">
          <div class="h">
            文书预览
            <small>生成后可翻页预览。</small>
          </div>
          <div class="pageTag" v-if="pdfUrl">
            第 <b>{{ pageNum }}</b> / {{ pageCount }} 页
          </div>
        </div>
        <div class="panelBody">
          <div class="paper">
            <div class="paperHead">
              <div class="docTitle">{{ state.base.title || "文书预览" }}</div>
              <div class="seal">预览件</div>
            </div>
            <div class="paperHr"></div>

            <PdfPreview
              :pdfUrl="pdfUrl"
              :pageNum="pageNum"
              @loaded="onPdfLoaded"
              @rendered="onPdfRendered"
              class="previewBox"
            />

            <div class="paperHr"></div>

            <div class="paperPager">
              <el-button size="small" @click="prevPage" :disabled="!pdfUrl || pageNum<=1">上一页</el-button>
              <el-button size="small" @click="nextPage" :disabled="!pdfUrl || pageNum>=pageCount">下一页</el-button>
            </div>
          </div>

          <div style="height:10px"></div>

          <div class="paperTip">
            建议打印：A4 单面，留出签名栏空白位置。
          </div>
        </div>
      </div>
    </div>

    <!-- dialogs -->
    <el-dialog v-model="catDialog.visible" title="新增类别" width="520px">
      <el-form label-position="top" :model="catDialog.form">
        <el-form-item label="类别名称">
          <el-input v-model="catDialog.form.title" placeholder="例如：作息与时间管理"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catDialog.visible=false">取消</el-button>
        <el-button type="primary" @click="confirmAddCategory">确认</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="ruleDialog.visible" :title="ruleDialog.editIndex>-1 ? '编辑条款' : '新增条款'" width="720px">

      <el-form label-position="top" :model="ruleDialog.form">
        <el-form-item label="条款描述">
          <el-input v-model="ruleDialog.form.desc" type="textarea" :rows="2" placeholder="例如：每日 23:00 前上床休息"></el-input>
        </el-form-item>
        <el-form-item label="违反判定标准">
          <el-input v-model="ruleDialog.form.criteria" type="textarea" :rows="2" placeholder="例如：23:00-23:30为宽限；超过则记为一次违规"></el-input>
        </el-form-item>

        <div class="row2">
          <el-form-item label="审查周期">
            <el-select v-model="ruleDialog.form.reviewCycle" style="width:100%">
              <el-option label="每日" value="每日"></el-option>
              <el-option label="每周" value="每周"></el-option>
              <el-option label="每月" value="每月"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="允许减免">
            <el-switch v-model="ruleDialog.form.allowRemit"></el-switch>
          </el-form-item>
        </div>

        <div class="hr"></div>

        <div class="tierHead">纠正梯度（可调整）</div>

        <div v-for="(t,idx) in ruleDialog.form.tiers" :key="idx" class="tierCard">
          <div class="tierRow">
            <el-input v-model="t.level" placeholder="档位名称，例如：初犯/再犯/屡犯" style="max-width:220px"></el-input>
            <el-button size="small" type="danger" plain @click="ruleDialog.form.tiers.splice(idx,1)">删除</el-button>
          </div>
          <el-input v-model="t.text" type="textarea" :rows="2" placeholder="写清楚这一档的纠正方式，例如：提醒 + 复盘 200 字"></el-input>
          <el-select
            :model-value="''"
            filterable
            placeholder="从通用库快速插入（可自由编辑）"
            style="width:100%; margin-top:8px"
            @update:modelValue="(v)=>appendTierText(t, v)"
          >
            <el-option v-for="o in tierInsertOptions" :key="o.key" :label="o.label" :value="o.value"></el-option>
          </el-select>
        </div>

        <div class="toolbar" style="justify-content:flex-end">
          <el-button @click="addTier">新增一档</el-button>
          <el-button @click="addTierTemplate">一键补全</el-button>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="ruleDialog.visible=false">取消</el-button>
        <el-button type="primary" @click="confirmRule">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rewardDialog.visible" :title="rewardDialog.editIndex>-1 ? '编辑奖励' : '新增奖励'" width="640px">
      <el-form label-position="top" :model="rewardDialog.form">
        <el-form-item label="触发条件（when）">
          <el-input v-model="rewardDialog.form.when" placeholder="例如：连续 7 天无违规"></el-input>
        </el-form-item>
        <el-form-item label="奖励/解锁（then）">
          <el-input v-model="rewardDialog.form.then" type="textarea" :rows="2" placeholder="例如：奖励一次自由安排时间 / 或减免一次轻度纠正"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rewardDialog.visible=false">取消</el-button>
        <el-button type="primary" @click="confirmReward">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import PdfPreview from "./components/PdfPreview.vue";
import { makePdfBytes } from "./utils/pdf";
import { exportJsonFile, getDraft, setDraft, clearDraft as clearDraftLocal } from "./utils/storage";

function uid(){
  return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}
function todayStr(){
  const d = new Date();
  const pad = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function linesToArray(s){
  return String(s||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
}

const DRAFT_KEY = "rules_docgen_draft_v1";

const SAMPLE_STATE = {
  mode: "together",
  base: {
    title: "House Rules Builder - Official Sample",
    date: todayStr(),
    partyA: "甲方（监督方）",
    partyB: "乙方（执行方）",
    safeword: "红灯",
    hardLimitsText: "不得在公共场合执行惩罚\n出现明显不适时立即停止\n不得在情绪失控或争吵状态下继续执行",
    aftercare: ["补水休息", "情绪复盘", "明确结束信号"],
    sscAccepted: true
  },
  categories: [
    {
      id: uid(),
      title: "作息与时间管理",
      rules: [
        {
          id: uid(),
          desc: "工作日 23:30 前完成洗漱并准备休息，00:00 前必须关闭娱乐并上床。",
          criteria: "23:30 后仍进行无必要娱乐视为提醒；00:00 后仍未停止视为一次违规。",
          reviewCycle: "每日",
          allowRemit: true,
          tiers: [
            { level: "初犯", text: "口头提醒 + 当日简短检讨 200 字" },
            { level: "再犯", text: "暂停娱乐 24 小时 + 检讨 400 字" },
            { level: "屡犯", text: "罚站 10 分钟 + 与监督方复盘作息问题并提交修正计划" }
          ]
        },
        {
          id: uid(),
          desc: "起床后 30 分钟内完成整理床铺、洗漱与当天第一项待办确认。",
          criteria: "起床后长时间拖延、回床刷视频或迟迟不进入当天状态，视为未完成。",
          reviewCycle: "每日",
          allowRemit: true,
          tiers: [
            { level: "初犯", text: "口头提醒 + 当晚复盘 1 次" },
            { level: "再犯", text: "次日提前 20 分钟起床 + 检讨 300 字" },
            { level: "屡犯", text: "罚站 10 分钟 + 连续 3 天晨间打卡" }
          ]
        }
      ]
    },
    {
      id: uid(),
      title: "学习/工作责任",
      rules: [
        {
          id: uid(),
          desc: "每日需完成“今日三件事”清单，并在晚间向监督方做简短汇报。",
          criteria: "当日 23:59 前未汇报，或清单无任何实际推进记录，视为一次违规。",
          reviewCycle: "每日",
          allowRemit: true,
          tiers: [
            { level: "初犯", text: "补报进度 + 说明原因" },
            { level: "再犯", text: "检讨 400 字 + 次日减少娱乐 30 分钟" },
            { level: "屡犯", text: "戒尺打手心 3 下（轻度）+ 与监督方复盘拖延成因并重排计划" }
          ]
        },
        {
          id: uid(),
          desc: "遇到困难时需主动说明，不得长期隐瞒、拖延或摆烂。",
          criteria: "已经出现明显进度问题却持续隐瞒，或提醒后仍不说明，视为违规。",
          reviewCycle: "每周",
          allowRemit: false,
          tiers: [
            { level: "初犯", text: "当日说明问题 + 共同拆解任务" },
            { level: "再犯", text: "检讨 300 字 + 重新安排计划表" },
            { level: "屡犯", text: "罚站 15 分钟 + 周末进行一次正式复盘" }
          ]
        }
      ]
    },
    {
      id: uid(),
      title: "礼貌与态度",
      rules: [
        {
          id: uid(),
          desc: "交流时需保持基本礼貌，不得故意冷处理、敷衍或带情绪攻击。",
          criteria: "出现阴阳怪气、长时间已读不回、故意回避沟通且无合理说明，视为违规。",
          reviewCycle: "每周",
          allowRemit: true,
          tiers: [
            { level: "初犯", text: "当次道歉 + 当晚复盘沟通方式" },
            { level: "再犯", text: "检讨 300 字 + 限制娱乐 12 小时" },
            { level: "屡犯", text: "戒尺打手心 3 下（轻度）+ 与监督方讨论沟通边界" }
          ]
        }
      ]
    }
  ],
  kit: {
    methods: ["口头提醒", "书面检讨", "限制娱乐时长", "额外任务"],
    process: "开始前确认状态与边界\n结束后补水休息\n24 小时内完成一次复盘总结\n必要时于次日补交书面检讨",
    nonPhysical: ["写检讨（200-500字）", "整理环境（30分钟）", "禁用短视频（24小时）", "罚站 10-15 分钟"]
  },
  rewards: [
    { when: "连续 7 天按时完成当日清单", then: "奖励一次自由安排的休闲时段" },
    { when: "连续 14 天无重复违规", then: "减少一次轻度惩罚记录或安排一次轻松活动" }
  ],
  review: {
    cycle: "每周",
    modify: "由双方共同确认后修改，旧版归档保留。",
    terminate: "任一方明确提出停止或连续一周未执行时，可终止本版本。",
    notes: "本示例仅用于展示正式、克制的规则书写法；具体内容应根据实际关系与边界自行调整。"
  }
};

const active = ref(0);
const stepLabels = [
  "模式",
  "原则",
  "主体信息",
  "通用库",
  "主体条款",
  "奖励",
  "审查终止",
  "预览导出"
];

const baseRef = ref(null);
const baseRef2 = ref(null);
const subjectRef = ref(null);

const isDesktop = ref(window.innerWidth >= 992);
window.addEventListener("resize", ()=>{
  isDesktop.value = window.innerWidth >= 992;
});

const aftercareOptions = [
  "补水休息",
  "情绪复盘",
  "明确结束信号",
  "鼓励/表扬",
  "放松活动（散步/洗澡）"
];
const kitMethodOptions = [
  "口头提醒",
  "书面复盘",
  "限制娱乐时长",
  "额外任务",
  "阶段性暂停某项权限"
];
const nonPhysicalOptions = [
  "写复盘（200-500字）",
  "整理环境（30分钟）",
  "早起执行（次日）",
  "禁用短视频（24小时）"
];

const tierInsertOptions = computed(()=>{
  const out = [];
  (state.kit?.methods || []).forEach(v=>{
    if(v) out.push({ key:"m_"+v, label:"方式：" + v, value:v });
  });
  (state.kit?.nonPhysical || []).forEach(v=>{
    if(v) out.push({ key:"n_"+v, label:"纠正：" + v, value:v });
  });
  const procLines = linesToArray(state.kit?.process || "");
  procLines.forEach(v=>{
    if(v) out.push({ key:"p_"+v, label:"流程：" + v, value:v });
  });
  // 去重
  const seen = new Set();
  return out.filter(o=>{
    const k = o.value;
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  });
});

function appendTierText(t, v){
  if(!t || !v) return;
  const cur = (t.text || "").trimEnd();
  if(!cur) t.text = v;
  else{
    // 追加到下一行，方便再编辑
    t.text = cur + "\n" + v;
  }
}

const state = reactive({
  mode: "solo",
  base: {
    title: "家规与自律协议",
    date: todayStr(),
    partyA: "本人（监督方）",
    partyB: "本人（执行方）",
    safeword: "红灯",
    hardLimitsText: "不得在公共场合执行纠正\n出现不适立即停止\n不在情绪失控时执行",
    aftercare: ["补水休息","情绪复盘"],
    sscAccepted: true
  },
  categories: [
    { id: uid(), title: "作息与时间管理", rules: [] },
    { id: uid(), title: "学习/工作责任", rules: [] }
  ],
  kit: {
    methods: ["口头提醒","书面复盘"],
    process: "执行前确认状态与边界；执行后补水休息；24小时内做一次复盘总结。",
    nonPhysical: ["写复盘（200-500字）"]
  },
  rewards: [],
  review: {
    cycle: "每月",
    modify: "需双方确认后更新版本，旧版归档。",
    terminate: "",
    notes: ""
  }
});

watch(()=>state.mode, (m)=>{
  if(m==="solo"){
    state.base.partyA ||= "本人";
    state.base.partyB = state.base.partyA;
  }else{
    state.base.partyA ||= "甲方（监督方）";
    state.base.partyB ||= "乙方（执行方）";
  }
}, { immediate:true });

watch(()=>state.base.partyA, (v)=>{
  if(state.mode==="solo"){
    state.base.partyB = v;
  }
});


const rulesBase = {
  partyA: [{ required:true, message:"请填写甲方称呼", trigger:"blur" }],
  partyB: [{ validator:(rule,value,cb)=>{ if(state.mode==="solo") return cb(); if(!value) return cb(new Error("请填写乙方称呼")); cb(); }, trigger:"blur" }],
  safeword: [{ required:true, message:"安全词必填", trigger:"blur" }],
  hardLimitsText: [{
    validator: (rule, value, cb)=>{
      const arr = linesToArray(value);
      if(arr.length < 1) cb(new Error("硬性边界至少一条"));
      else cb();
    },
    trigger:"blur"
  }]
};

const rulesSubject = {
  title: [{ required:true, message:"请填写标题", trigger:"blur" }],
  date: [{ required:true, message:"请选择日期", trigger:"change" }]
};

const totalRules = computed(()=> state.categories.reduce((sum,c)=> sum + (c.rules?.length||0), 0));

const hasDraft = computed(()=> !!getDraft(DRAFT_KEY));

const activeCatIndex = ref(0);

const catDialog = reactive({ visible:false, form:{ title:"" } });
function openCatDialog(){
  catDialog.form.title = "";
  catDialog.visible = true;
}
function confirmAddCategory(){
  const title = (catDialog.form.title||"").trim();
  if(!title){ ElMessage.warning("类别名称不能为空"); return; }
  state.categories.push({ id: uid(), title, rules: [] });
  activeCatIndex.value = state.categories.length - 1;
  catDialog.visible = false;
  ElMessage.success("已新增类别");
}
function removeCategory(i){
  state.categories.splice(i,1);
  activeCatIndex.value = state.categories.length ? Math.min(activeCatIndex.value, state.categories.length-1) : -1;
  ElMessage.success("已删除类别");
}
function selectCategory(i){ activeCatIndex.value = i; }
function useCategoryTemplates(){
  const preset = ["健康与生活习惯","礼貌与态度","诚实与承诺","家务与卫生","设备与网络使用"];
  const existed = new Set(state.categories.map(c=>c.title));
  preset.forEach(t=>{
    if(!existed.has(t)) state.categories.push({ id: uid(), title:t, rules:[] });
  });
  if(activeCatIndex.value < 0 && state.categories.length) activeCatIndex.value = 0;
  ElMessage.success("已加载常用类别");
}

const ruleDialog = reactive({ visible:false, editIndex:-1, form:null });

function baseRuleForm(){
  return {
    id: uid(),
    desc: "",
    criteria: "",
    reviewCycle: "每日",
    allowRemit: false,
    tiers: [
      { level:"初犯", text:"提醒 + 复盘 200 字" },
      { level:"再犯", text:"限制娱乐 + 复盘 400 字" },
      { level:"屡犯", text:"升级限制 + 修正计划" }
    ]
  };
}
function openRuleDialog(){
  if(activeCatIndex.value < 0){ ElMessage.warning("先选择一个类别"); return; }
  ruleDialog.editIndex = -1;
  ruleDialog.form = baseRuleForm();
  ruleDialog.visible = true;
}
function addTier(){ ruleDialog.form.tiers.push({ level:"新增档位", text:"" }); }
function addTierTemplate(){
  ruleDialog.form.tiers = [
    { level:"初犯", text:"提醒 + 复盘 200 字" },
    { level:"再犯", text:"限制娱乐 + 复盘 400 字" },
    { level:"屡犯", text:"升级限制 + 修正计划" },
    { level:"清算", text:"审查会议 + 重设目标 + 新版条款确认" }
  ];
}
function confirmRule(){
  const f = ruleDialog.form;
  if(!f.desc.trim()){ ElMessage.warning("条款描述不能为空"); return; }
  if(!f.tiers.length){ ElMessage.warning("至少需要一档纠正梯度"); return; }
  f.tiers = f.tiers
    .map(t=>({ level:(t.level||"").trim()||"档位", text:(t.text||"").trim()||"（未填写）" }))
    .filter(t=>t.level);

  const rulesArr = state.categories[activeCatIndex.value].rules;
  if(ruleDialog.editIndex > -1){
    rulesArr[ruleDialog.editIndex] = JSON.parse(JSON.stringify(f));
    ElMessage.success("已更新条款");
  }else{
    rulesArr.push(JSON.parse(JSON.stringify(f)));
    ElMessage.success("已新增条款");
  }
  ruleDialog.visible = false;
}
function editRule(idx){
  const r = state.categories[activeCatIndex.value].rules[idx];
  ruleDialog.editIndex = idx;
  ruleDialog.form = JSON.parse(JSON.stringify(r));
  ruleDialog.visible = true;
}
function removeRule(idx){
  state.categories[activeCatIndex.value].rules.splice(idx,1);
  ElMessage.success("已删除条款");
}

const rewardDialog = reactive({ visible:false, editIndex:-1, form:{ when:"", then:"" } });
function openRewardDialog(){
  rewardDialog.editIndex = -1;
  rewardDialog.form = { when:"", then:"" };
  rewardDialog.visible = true;
}
function addRewardTemplate(){
  state.rewards.push({ when:"连续 7 天无违规", then:"奖励一次自由安排时间（或减免一次轻度纠正）" });
  ElMessage.success("已添加模板奖励");
}
function confirmReward(){
  const w = (rewardDialog.form.when||"").trim();
  const t = (rewardDialog.form.then||"").trim();
  if(!w || !t){ ElMessage.warning("when/then 都要填"); return; }
  if(rewardDialog.editIndex>-1){
    state.rewards[rewardDialog.editIndex] = { when:w, then:t };
    ElMessage.success("已更新奖励");
  }else{
    state.rewards.push({ when:w, then:t });
    ElMessage.success("已新增奖励");
  }
  rewardDialog.visible = false;
}
function editReward(i){
  rewardDialog.editIndex = i;
  rewardDialog.form = JSON.parse(JSON.stringify(state.rewards[i]));
  rewardDialog.visible = true;
}
function removeReward(i){
  state.rewards.splice(i,1);
  ElMessage.success("已删除奖励");
}

// PDF
const pdfUrl = ref("");
let pdfBytesCache = null;

const pageNum = ref(1);
const pageCount = ref(1);

function onPdfLoaded(meta){
  pageCount.value = meta.pageCount;
  pageNum.value = 1;
}
function onPdfRendered(){}

async function buildPdf(opts = {}){
  const strict = opts.strict !== false; // default true
  const toast = opts.toast !== false;   // default true

  if(strict){
    if(!state.base.safeword.trim()){ toast && ElMessage.warning("安全词必填"); return false; }
    if(linesToArray(state.base.hardLimitsText).length < 1){ toast && ElMessage.warning("硬性边界至少一条"); return false; }
    if(!state.base.sscAccepted){ toast && ElMessage.warning("请先勾选原则确认"); return false; }
    if(totalRules.value < 1){ toast && ElMessage.warning("至少添加一条家规条款"); return false; }
  }

  try{
    toast && ElMessage.info("正在生成 PDF...");
    const bytes = await makePdfBytes(state);
    pdfBytesCache = bytes;

    const blob = new Blob([bytes], {type:"application/pdf"});
    if(pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
    pdfUrl.value = URL.createObjectURL(blob);

    toast && ElMessage.success("PDF 已刷新");
    return true;
  }catch(e){
    console.error(e);
    toast && ElMessage.error("生成 PDF 失败");
    return false;
  }
}

const previewPanelRef = ref(null);

async function previewPdf(){
  const ok = await buildPdf({ strict:false, toast:false });
  if(!ok) return;
  // 手机端：点预览就滚到预览区
  if(!isDesktop.value){
    await nextTick();
    previewPanelRef.value?.scrollIntoView?.({ behavior:"smooth", block:"start" });
  }
}

// 桌面端：所改即所得（停 500ms 自动刷新预览）
let _autoTimer = null;
watch(state, ()=>{
  if(!isDesktop.value) return;
  clearTimeout(_autoTimer);
  _autoTimer = setTimeout(()=>{
    // 静默刷新
    buildPdf({ strict:false, toast:false });
  }, 500);
},{ deep:true });

function downloadPdf(){
  if(!pdfBytesCache){ ElMessage.warning("先生成 PDF"); return; }
  const blob = new Blob([pdfBytesCache], {type:"application/pdf"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "rules-contract.pdf";
  a.click();
  URL.revokeObjectURL(a.href);
}
function prevPage(){ if(pageNum.value>1) pageNum.value--; }
function nextPage(){ if(pageNum.value<pageCount.value) pageNum.value++; }

// nav
async function validateCurrent(){
  if(active.value===0){
    const ok = await baseRef.value?.validate?.().catch(()=>false);
    return !!ok;
  }
  if(active.value===1){
    const ok = await baseRef2.value?.validate?.().catch(()=>false);
    if(!ok) return false;
    if(!state.base.sscAccepted){ ElMessage.warning("请先勾选原则确认"); return false; }
    return true;
  }
  if(active.value===2){
    const ok = await subjectRef.value?.validate?.().catch(()=>false);
    return !!ok;
  }
  if(active.value===4){
    if(totalRules.value < 1){ ElMessage.warning("至少添加一条家规条款"); return false; }
    return true;
  }
  return true;
}

async function setActive(i){
  if(i<=active.value){ active.value = i; return; }
  // 只允许按顺序前进，避免跳步骤导致状态不完整
  while(active.value < i){
    const ok = await validateCurrent();
    if(!ok) return;
    active.value++;
  }
}

async function next(){
  if(active.value>=stepLabels.length-1) return;
  const ok = await validateCurrent();
  if(!ok) return;
  active.value++;
  if(active.value===stepLabels.length-1){
    await nextTick();
    await buildPdf({ strict:true, toast:false });
  }
}
function prev(){ if(active.value>0) active.value--; }
// draft/export
function saveDraft(){
  setDraft(DRAFT_KEY, JSON.parse(JSON.stringify(state)));
  ElMessage.success("草稿已保存（本地）");
}
function loadDraft(){
  const obj = getDraft(DRAFT_KEY);
  if(!obj){ ElMessage.warning("没有找到草稿"); return; }
  Object.assign(state, obj);
  activeCatIndex.value = state.categories.length ? 0 : -1;
  ElMessage.success("草稿已加载");
}
function clearDraft(){
  clearDraftLocal(DRAFT_KEY);
  ElMessage.success("草稿已清空");
}
async function loadExample(){
  try{
    await ElMessageBox.confirm(
      "加载示例会覆盖当前未保存内容，是否继续？",
      "加载示例",
      {
        confirmButtonText: "继续加载",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
  }catch{
    return;
  }

  const obj = JSON.parse(JSON.stringify(SAMPLE_STATE));
  Object.assign(state, obj);
  activeCatIndex.value = state.categories.length ? 0 : -1;
  await nextTick();
  if(isDesktop.value){
    buildPdf({ strict:false, toast:false });
  }
  ElMessage.success("示例已加载");
}
async function importJson(){
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.onchange = async ()=>{
    const file = input.files && input.files[0];
    if(!file) return;
    try{
      const txt = await file.text();
      const obj = JSON.parse(txt);
      Object.assign(state, obj);
      activeCatIndex.value = state.categories.length ? 0 : -1;
      ElMessage.success("已导入 JSON");
    }catch(e){
      console.error(e);
      ElMessage.error("JSON 导入失败");
    }
  };
  input.click();
}

function exportJson(){
  exportJsonFile("rules-contract-backup.json", state);
}

onMounted(()=>{
  activeCatIndex.value = state.categories.length ? 0 : -1;
});
</script>

<style scoped>
.stepTitle{
  margin: 2px 0 8px;
  font-family: var(--serif);
  letter-spacing:.6px;
  font-size: 16px;
}
.stepHint{
  margin: 0 0 12px;
  color: grey;
  font-size: 12px;
  line-height: 1.6;
}
.row2{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 680px){
  .row2{ grid-template-columns: 1fr; }
}
.toolbar{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  justify-content:flex-start;
  margin: 8px 0 12px;
}
.t1{ font-weight: 750; }
.t2{ color: grey; font-size: 12px; margin-top: 4px; }
.subBlock{ display:flex; flex-direction:column; gap:10px; }
.subHead{ display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
.subTitle{ font-weight: 800; letter-spacing:.2px; }
.subHint{ color: grey; font-size: 12px; margin-top: 4px; }
.emptyHint{
  color: grey;
  font-size: 12px;
  padding: 10px 0;
}
.ruleItem{
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
}
.ruleTop{ display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
.ruleTitle{ font-weight: 750; line-height: 1.45; }
.ruleOps{ display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
.ruleMeta{ margin-top: 8px; color: grey; font-size: 12px; line-height: 1.6; }
.ruleMeta b{ color: grey; }
.tierBox{ margin-top: 6px; }
.tierLine{ display:flex; gap:8px; margin-top: 4px; }
.tierL{
  min-width: 52px;
  font-weight: 800;
  color: grey;
}
.tierT{ color: grey; }
.noteBox{
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  color: grey;
  font-size: 12px;
  line-height: 1.6;
}
.navRow{ display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; }
.paperPager{ display:flex; justify-content:space-between; gap:10px; padding: 10px 12px; }
.paperTip{
  color: grey;
  font-size: 12px;
  line-height: 1.6;
}
.pageTag{ color: grey; font-size: 12px; }
.previewBox{ padding: 8px 12px 12px; }
.tierHead{ font-weight: 800; margin: 6px 0 10px; }
.tierCard{
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  margin-bottom: 10px;
}
.tierRow{ display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom: 8px; }

.actionBar{ display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; }
@media (max-width: 720px){
  .actionBar{ justify-content:flex-start; }
  .actionBar .el-button{ flex:1 1 calc(50% - 8px); }
}

.stepNav{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 12px; }
.stepPill{
  display:flex; align-items:center; gap:8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #fff;
  cursor: pointer;
  user-select:none;
  font-size: 12px;
}
.stepPill .n{
  width: 18px; height: 18px;
  border-radius: 999px;
  display:flex; align-items:center; justify-content:center;
  border: 1px solid var(--line);
  font-weight: 700;
}
.stepPill.on{
  border-color: rgba(37,99,235,.55);
  box-shadow: 0 6px 18px rgba(37,99,235,.12);
}
.stepPill.on .n{ border-color: rgba(37,99,235,.55); }
.stepPill.done{
  border-color: rgba(22,163,74,.45);
  background: rgba(22,163,74,.04);
}
.stepPill.done .n{ border-color: rgba(22,163,74,.45); }


/* ===== 主体条款：类别列表（可点整行切换编辑） ===== */
.catList{
  display:flex;
  flex-direction:column;
  gap:10px;
}
.catItem{
  position:relative;
  padding:12px 44px 12px 14px;
  border:1px solid rgba(0,0,0,.12);
  border-radius:10px;
  background:#fff;
  cursor:pointer;
  user-select:none;
  transition: border-color .12s ease, box-shadow .12s ease;
}
.catItem:hover{
  border-color: rgba(0,0,0,.22);
}
.catItem.active{
  border-color: rgba(0,0,0,.35);
  box-shadow: 0 1px 10px rgba(0,0,0,.06);
}
.delCircle{
  position:absolute;
  top:10px;
  right:10px;
  width:24px;
  height:24px;
  border-radius:999px;
  border:none;
  background:#d92d20;
  color:#fff;
  font-size:16px;
  line-height:24px;
  text-align:center;
  cursor:pointer;
}
.delCircle:hover{
  filter:brightness(.95);
}

</style>