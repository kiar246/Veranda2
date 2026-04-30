import { useState } from 'react';
import Layout from '@/components/Layout';
import { Heart, Settings2, Users, Mail, Phone, MapPin, ArrowRight, Briefcase, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { config } from '@/lib/config';

// ---------- Inquiry Form (Ask & we reply fast) ----------
const InquiryForm = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', note: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const resp = await fetch(`${config.API_BASE_URL}/api/v1/inquiry/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          note: form.note.trim(),
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(data?.detail || data?.message || `提交失败（HTTP ${resp.status}）`);
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '提交失败，请稍后再试';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lg:col-span-5">
      <div className="bg-neutral-950 text-white p-8 md:p-10 h-full flex flex-col">
        <div className="text-xs tracking-[0.3em] text-neutral-400 uppercase mb-3">Quick Inquiry</div>
        <h3 className="font-display text-3xl font-light mb-2">在线询价</h3>
        <p className="text-sm text-neutral-300 font-serif-cn mb-8 leading-relaxed">
          留下您的联系方式，<span className="text-gold">我们会马上与您联系 · 秒回</span>
        </p>

        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 fade-in">
            <CheckCircle2 className="w-14 h-14 text-gold mb-6" strokeWidth={1} />
            <div className="font-display text-2xl font-light mb-3">提交成功</div>
            <p className="text-sm text-neutral-300 font-serif-cn leading-relaxed max-w-xs">
              感谢您的信任，我们的销售经理将在第一时间与您取得联系。
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setForm({ name: '', email: '', phone: '', note: '' });
              }}
              className="mt-8 text-xs tracking-[0.3em] uppercase text-neutral-400 hover:text-white transition underline-offset-4 hover:underline"
            >
              再次提交
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
            <div>
              <label className="block text-[11px] tracking-[0.25em] text-neutral-400 uppercase mb-2">姓名 · Name</label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-neutral-700 focus:border-white py-2 text-sm text-white placeholder:text-neutral-600 outline-none transition"
                placeholder="请输入您的姓名"
              />
            </div>
            <div>
              <label className="block text-[11px] tracking-[0.25em] text-neutral-400 uppercase mb-2">邮箱 · Email</label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-neutral-700 focus:border-white py-2 text-sm text-white placeholder:text-neutral-600 outline-none transition"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="block text-[11px] tracking-[0.25em] text-neutral-400 uppercase mb-2">电话 · Phone</label>
              <input
                type="tel"
                name="phone"
                required
                value={form.phone}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-neutral-700 focus:border-white py-2 text-sm text-white placeholder:text-neutral-600 outline-none transition"
                placeholder="+86 ..."
              />
            </div>
            <div>
              <label className="block text-[11px] tracking-[0.25em] text-neutral-400 uppercase mb-2">备注 · Note</label>
              <textarea
                name="note"
                rows={3}
                value={form.note}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-neutral-700 focus:border-white py-2 text-sm text-white placeholder:text-neutral-600 outline-none transition resize-none"
                placeholder="请简述您的需求或咨询内容"
              />
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 text-xs text-red-400 font-serif-cn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-neutral-950 text-xs tracking-[0.3em] uppercase hover:bg-gold hover:text-neutral-950 transition disabled:opacity-60"
            >
              {submitting ? '提交中...' : '立即提交'}
              <Send className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const philosophies = [
  { num: '01', icon: Heart, title: '以诚信服务为核心价值观', en: 'Integrity First', desc: '广州华安达实业始终以"诚信服务"为核心价值观，深耕制冷与暖通领域，服务客户遍及全国。已与数千家企业建立合作，覆盖制冷设备、冷链物流、能源环保及智能制造等多个行业，形成稳定且持续增长的客户网络。依托完善的供应链体系与专业服务能力，华安达能够实现快速响应与稳定交付，为客户提供可靠、高效的解决方案。' },
  { num: '02', icon: Settings2, title: '以科学管理为支撑', en: 'Scientific Management', desc: '华安达坚持以科学管理为基础，持续推进流程规范化与运营精细化建设，形成高效协同的内部管理体系。通过不断优化业务流程与资源配置，公司在保障服务质量的同时提升整体运作效率，为客户提供稳定、可持续的服务保障。' },
  { num: '03', icon: Users, title: '以高素质的人才为动力', en: 'Talent Driven', desc: '公司高度重视人才队伍建设，持续引进并培养具备专业能力与责任意识的高素质人才。依托经验丰富的团队与良好的成长机制，华安达不断提升服务水平与技术能力，为企业长期发展注入持续动力。' },
];

const About = () => {
  const [showCareer, setShowCareer] = useState(false);

  return (
    <Layout>
      <section className="relative bg-paper py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full border border-neutral-900" />
          <div className="absolute top-0 -right-20 w-[500px] h-[500px] rounded-full border border-neutral-900" />
        </div>
        <div className="container-x relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-px bg-neutral-900"></div>
              <span className="text-xs tracking-[0.3em] text-neutral-600 uppercase">About Veranda</span>
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-neutral-950 font-light leading-[1.1]">
              关于华安达
              <br />
              <span className="italic text-neutral-500">Since 1996</span>
            </h1>
          </div>
          <div className="lg:col-span-5">
            <p className="text-base text-neutral-600 font-serif-cn leading-relaxed">
              华安达实业成立于 1996 年，是一家优秀的民营企业，专注于压缩机产品销售及相关方案配套服务。公司深耕暖通及工业领域多年，业务覆盖全国，产品广泛应用于热泵、空调、冷冻等领域。
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white border-b border-neutral-200">
        <div className="container-x grid grid-cols-2 md:grid-cols-4 gap-12">
          <div>
            <div className="font-display text-5xl text-neutral-950 font-light">1996</div>
            <div className="text-xs tracking-widest text-neutral-500 uppercase mt-2">Established</div>
          </div>
          <div>
            <div className="font-display text-5xl text-neutral-950 font-light">30<span className="text-2xl italic">+</span></div>
            <div className="text-xs tracking-widest text-neutral-500 uppercase mt-2">Years</div>
          </div>
          <div>
            <div className="font-display text-5xl text-neutral-950 font-light">1000<span className="text-2xl italic">+</span></div>
            <div className="text-xs tracking-widest text-neutral-500 uppercase mt-2">Partners</div>
          </div>
          <div>
            <div className="font-display text-5xl text-neutral-950 font-light">全国</div>
            <div className="text-xs tracking-widest text-neutral-500 uppercase mt-2">Nationwide Network</div>
          </div>
        </div>
      </section>

      <section className="py-28 bg-neutral-50">
        <div className="container-x">
          <div className="text-center mb-20">
            <div className="text-xs tracking-[0.3em] text-neutral-500 uppercase mb-4">Our Philosophy</div>
            <h2 className="font-display text-4xl md:text-5xl text-neutral-950 font-light">我们的理念</h2>
            <div className="divider-art max-w-xs mx-auto mt-6"></div>
          </div>

          <div className="space-y-12">
            {philosophies.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={i} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start group">
                  <div className="lg:col-span-3">
                    <div className="flex items-center gap-4">
                      <span className="art-number text-7xl">{p.num}</span>
                      <Icon className="w-8 h-8 text-neutral-700" strokeWidth={1} />
                    </div>
                  </div>
                  <div className="lg:col-span-9 lg:border-l lg:border-neutral-300 lg:pl-12">
                    <div className="text-xs tracking-[0.3em] text-neutral-500 uppercase mb-3">{p.en}</div>
                    <h3 className="font-display text-2xl md:text-3xl text-neutral-950 mb-5 font-light">{p.title}</h3>
                    <p className="text-base text-neutral-600 leading-relaxed font-serif-cn">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="container-x">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <div className="text-xs tracking-[0.3em] text-neutral-500 uppercase mb-4">Latest News</div>
              <h2 className="font-display text-4xl md:text-5xl text-neutral-950 font-light">新闻 <span className="italic">· News</span></h2>
            </div>
          </div>

          <article className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7 grid grid-cols-2 gap-4">
              <div className="aspect-[4/5] overflow-hidden image-zoom col-span-2 md:col-span-1">
                <img src="/assets/about/expo1.jpg" alt="2026中国制冷展" className="w-full h-full object-cover" />
              </div>
              <div className="aspect-[4/5] overflow-hidden image-zoom col-span-2 md:col-span-1">
                <img src="/assets/about/expo2.jpg" alt="2026中国制冷展" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="text-xs tracking-[0.25em] text-neutral-500 uppercase mb-4">2026.04.08 — 04.10 · Beijing</div>
              <h3 className="font-display text-3xl md:text-4xl text-neutral-950 font-light leading-snug mb-6">
                华安达实业亮相 <span className="italic">2026 中国制冷展</span>
              </h3>
              <div className="space-y-4 text-sm text-neutral-600 leading-relaxed font-serif-cn">
                <p>2026 年 4 月 8 日至 10 日，中国制冷展在首都国际会展中心隆重举办。本届展会汇聚全球暖通空调与制冷行业众多知名企业与专业观众，是行业内极具影响力的重要盛会。</p>
                <p>广州华安达实业有限公司受邀参展，携多款压缩机产品及系统解决方案精彩亮相（展台号：<span className="font-medium text-neutral-900">A2H11</span>）。公司围绕热泵、空调及冷冻应用场景，重点展示了在暖通及工业领域的成熟应用经验与技术优势。</p>
                <p>展会期间，华安达实业通过现场产品展示、技术交流及案例分享，与来自全国乃至全球的行业客户及合作伙伴进行了深入沟通，进一步拓展了市场合作空间，提升了品牌影响力。</p>
                <p>作为一家成立于 1996 年的专业企业，华安达实业始终专注于压缩机产品销售及配套解决方案服务。未来，公司将继续以客户需求为导向，为行业提供更加高效、可靠的系统解决方案。</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="py-24 bg-neutral-950 text-white">
        <div className="container-x">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="text-xs tracking-[0.3em] text-neutral-400 uppercase mb-4">Join Us</div>
              <div className="font-display text-2xl md:text-3xl text-gold mb-3 font-light tracking-wider">加入我们</div>
              <h2 className="font-display text-4xl md:text-5xl font-light mb-6">开启职业 <span className="italic">新篇章</span></h2>
              <p className="text-base text-neutral-300 leading-relaxed font-serif-cn mb-8 max-w-xl">
                销售经理长期招人，其他岗位欢迎进一步咨询，我们欢迎每一位高素质人才的到来！
              </p>
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm text-neutral-300">
                  <Mail className="w-4 h-4" strokeWidth={1.5} />
                  <span>veranda@veranda.cn</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-300">
                  <Phone className="w-4 h-4" strokeWidth={1.5} />
                  <span>+86 133 9247 3750</span>
                </div>
              </div>
              <button
                onClick={() => setShowCareer(!showCareer)}
                className="inline-flex items-center gap-2 px-8 py-3 bg-white text-neutral-950 text-sm tracking-widest uppercase hover:bg-neutral-200 transition"
              >
                {showCareer ? '收起详情' : '立即申请'}
                <ArrowRight className={`w-4 h-4 transition-transform ${showCareer ? 'rotate-90' : ''}`} />
              </button>
            </div>
            <div className="lg:col-span-5">
              <div className="border border-neutral-800 p-8">
                <Briefcase className="w-10 h-10 mb-6 text-neutral-400" strokeWidth={1} />
                <div className="text-xs tracking-[0.3em] text-neutral-400 uppercase mb-2">Position</div>
                <div className="font-display text-3xl font-light mb-4">销售经理</div>
                <div className="text-xs text-neutral-400 tracking-widest uppercase">Sales Manager · HVACR</div>
              </div>
            </div>
          </div>

          {showCareer && (
            <div className="mt-12 border-t border-neutral-800 pt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 fade-in">
              <div className="lg:col-span-6">
                <div className="text-xs tracking-[0.3em] text-gold uppercase mb-4">Job Requirements</div>
                <h3 className="font-display text-2xl md:text-3xl font-light mb-6">岗位要求</h3>
                <ul className="space-y-3 text-sm text-neutral-300 font-serif-cn leading-relaxed list-disc list-inside">
                  <li>大专及以上学历，市场营销、机电、制冷或相关专业优先；</li>
                  <li>3 年以上压缩机、暖通、制冷行业销售经验者优先；</li>
                  <li>具备良好的商务沟通与谈判能力，抗压能力强；</li>
                  <li>熟悉行业客户资源，能独立开发与维护大客户；</li>
                  <li>有责任心、团队合作精神，认同公司价值观。</li>
                </ul>
              </div>
              <div className="lg:col-span-6">
                <div className="text-xs tracking-[0.3em] text-gold uppercase mb-4">Responsibilities & Benefits</div>
                <h3 className="font-display text-2xl md:text-3xl font-light mb-6">岗位职责 & 福利</h3>
                <ul className="space-y-3 text-sm text-neutral-300 font-serif-cn leading-relaxed list-disc list-inside mb-6">
                  <li>负责压缩机及相关产品的市场开发与销售；</li>
                  <li>维护现有客户关系，持续挖掘合作机会；</li>
                  <li>跟进项目进度，配合技术与交付团队完成签约与服务。</li>
                </ul>
                <div className="text-xs tracking-[0.25em] text-neutral-400 uppercase mb-3">福利待遇</div>
                <p className="text-sm text-neutral-300 font-serif-cn leading-relaxed mb-6">
                  基本工资 + 绩效提成 + 项目奖金；五险一金；带薪年假；定期团建与培训；广阔的晋升空间。
                </p>
                <div className="text-xs tracking-[0.25em] text-neutral-400 uppercase mb-2">简历投递</div>
                <p className="text-sm text-neutral-200 font-serif-cn">
                  请将简历发送至 <a href="mailto:veranda@veranda.cn" className="text-gold hover:underline">veranda@veranda.cn</a>，或致电 <a href="tel:+8613392473750" className="text-gold hover:underline">+86 133 9247 3750</a>。
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="container-x">
          <div className="text-center mb-16">
            <div className="text-xs tracking-[0.3em] text-neutral-500 uppercase mb-4">Contact Us</div>
            <h2 className="font-display text-4xl md:text-5xl text-neutral-950 font-light">联系我们</h2>
            <div className="divider-art max-w-xs mx-auto mt-6"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-6">
              <div className="p-8 border border-neutral-200 hover-lift flex items-start gap-6">
                <Mail className="w-8 h-8 text-neutral-700 flex-shrink-0 mt-1" strokeWidth={1} />
                <div>
                  <div className="text-xs tracking-[0.25em] text-neutral-500 uppercase mb-2">Email</div>
                  <a href="mailto:veranda@veranda.cn" className="font-display text-xl text-neutral-950 hover:text-neutral-600 transition">veranda@veranda.cn</a>
                </div>
              </div>
              <div className="p-8 border border-neutral-200 hover-lift flex items-start gap-6">
                <Phone className="w-8 h-8 text-neutral-700 flex-shrink-0 mt-1" strokeWidth={1} />
                <div>
                  <div className="text-xs tracking-[0.25em] text-neutral-500 uppercase mb-2">Phone</div>
                  <a href="tel:+862087690208" className="font-display text-xl text-neutral-950 hover:text-neutral-600 transition block">+86 20 8769 0208</a>
                  <a href="tel:+8613392473750" className="font-display text-base text-neutral-600 hover:text-neutral-900 transition block mt-1">+86 133 9247 3750</a>
                </div>
              </div>
              <div className="p-8 border border-neutral-200 hover-lift flex items-start gap-6">
                <MapPin className="w-8 h-8 text-neutral-700 flex-shrink-0 mt-1" strokeWidth={1} />
                <div>
                  <div className="text-xs tracking-[0.25em] text-neutral-500 uppercase mb-2">Address</div>
                  <p className="text-sm text-neutral-700 font-serif-cn leading-relaxed">广州市天河区珠江新城珠江西路 17 号<br />广晟国际大厦 24F</p>
                </div>
              </div>
            </div>

            <InquiryForm />
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
