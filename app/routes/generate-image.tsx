import { FC, useState, ChangeEvent, FormEvent } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import type { ActionFunction, LoaderFunction } from "@remix-run/cloudflare";
import { createAppContext } from "../context";
import { AppError } from "../utils/error";

export const loader: LoaderFunction = async ({ context }) => {
  const appContext = createAppContext(context);
  const { config } = appContext;

  try {
    // 测试 Cloudflare AI 连接
    await appContext.imageGenerationService.testCfAiConnection();
    console.log("Cloudflare AI connection test successful");
  } catch (error) {
    console.error("Cloudflare AI connection test failed:", error);
  }

  const models = Object.keys(config.CUSTOMER_MODEL_MAP).map((id) => ({
    id,
    value: config.CUSTOMER_MODEL_MAP[id],
  }));

  return json({ models, config });
};

export const action: ActionFunction = async ({ request, context }: { request: Request; context: any }) => {
  const appContext = createAppContext(context);
  const { imageGenerationService, config } = appContext;

  console.log("Generate image action started");
  console.log("Config:", JSON.stringify(config, null, 2));

  const formData = await request.formData();
  const prompt = formData.get("prompt") as string;
  const enhance = formData.get("enhance") === "true";
  const modelId = formData.get("model") as string;
  const size = formData.get("size") as string;
  const numSteps = parseInt(formData.get("numSteps") as string, 10);

  console.log("Form data:", { prompt, enhance, modelId, size, numSteps });

  if (!prompt) {
    return json({ error: "未找到提示词" }, { status: 400 });
  }

  const model = config.CUSTOMER_MODEL_MAP[modelId];
  if (!model) {
    return json({ error: "无效的模型" }, { status: 400 });
  }

  try {
    const result = await imageGenerationService.generateImage(
      enhance ? `---tl ${prompt}` : prompt,
      model,
      size,
      numSteps
    );
    console.log("Image generation successful");
    return json(result);
  } catch (error) {
    console.error("生成图片时出错:", error);
    if (error instanceof AppError) {
      return json({ error: `生成图片失败: ${error.message}` }, { status: error.status || 500 });
    }
    return json({ error: "生成图片失败: 未知错误" }, { status: 500 });
  }
};

const GenerateImage: FC = () => {
  const { models, config } = useLoaderData<typeof loader>();
  const [prompt, setPrompt] = useState("");
  const [enhance, setEnhance] = useState(false);
  const [model, setModel] = useState(config.CUSTOMER_MODEL_MAP["FLUX.1-Schnell-CF"]);
  const [size, setSize] = useState("1024x1024");
  const [numSteps, setNumSteps] = useState(config.FLUX_NUM_STEPS);
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  const handleEnhanceToggle = () => {
    setEnhance(!enhance);
  };

  const handleReset = () => {
    setPrompt("");
    setEnhance(false);
    setModel(config.CUSTOMER_MODEL_MAP["FLUX.1-Schnell-CF"]);
    setSize("1024x1024");
    setNumSteps(config.FLUX_NUM_STEPS);
  };

  const handlePromptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (isSubmitting) {
      e.preventDefault();
    }
  };

  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 px-4 py-8">
      <div className="relative bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-4xl w-full">
        <h1 className="text-4xl font-extrabold text-white mb-6 text-center drop-shadow-lg">
          CF Flux Remix
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 左侧表单 */}
          <div>
            <Form method="post" className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="prompt" className="block text-white text-lg font-semibold mb-2">
                  输入提示词：
                </label>
                <textarea
                  id="prompt"
                  name="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-70 transition duration-300 ease-in-out hover:bg-opacity-30 min-h-[120px] resize-y"
                  placeholder="请输入您的提示词..."
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="model" className="block text-white text-lg font-semibold mb-2">
                    选择模型：
                  </label>
                  <select
                    id="model"
                    name="model"
                    value={model}
                    onChange={handleModelChange}
                    className="w-full px-4 py-2 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-white transition duration-300 ease-in-out hover:bg-opacity-30"
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.id}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="size" className="block text-white text-lg font-semibold mb-2">
                    图片比例：
                  </label>
                  <select
                    id="size"
                    name="size"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-white transition duration-300 ease-in-out hover:bg-opacity-30"
                  >
                    <option value="1024x1024">1:1 (1024x1024)</option>
                    <option value="512x1024">1:2 (512x1024)</option>
                    <option value="768x512">3:2 (768x512)</option>
                    <option value="768x1024">3:4 (768x1024)</option>
                    <option value="1024x576">16:9 (1024x576)</option>
                    <option value="576x1024">9:16 (576x1024)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="numSteps" className="block text-white text-lg font-semibold mb-2">
                  生成步数：{numSteps}
                </label>
                <input
                  type="range"
                  id="numSteps"
                  name="numSteps"
                  value={numSteps}
                  onChange={(e) => setNumSteps(parseInt(e.target.value, 10))}
                  min="4"
                  max="8"
                  step="1"
                  className="w-full h-2 bg-white bg-opacity-30 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={handleEnhanceToggle}
                  className={`flex-1 px-4 py-3 rounded-xl text-lg font-medium text-white transition focus:outline-none
                            ${enhance ? "bg-blue-500" : "bg-gray-500"}`}
                  disabled={isSubmitting}
                >
                  {enhance ? "已强化提示词" : "强化提示词"}
                </button>
                <input type="hidden" name="enhance" value={enhance.toString()} />
                
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 px-4 py-3 rounded-xl text-lg font-medium text-white bg-orange-500 transition focus:outline-none focus:ring-2 focus:ring-orange-300"
                  disabled={isSubmitting}
                >
                  重置
                </button>
                
                <button
                  type="submit"
                  className={`flex-1 px-4 py-3 rounded-xl text-lg font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-blue-300
                            ${isSubmitting ? "bg-gray-500 cursor-not-allowed" : "bg-blue-500"}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "生成中..." : "生成图片"}
                </button>
              </div>
            </Form>
            
            {actionData?.error && (
              <div className="mt-4 p-3 bg-red-500 bg-opacity-30 text-white rounded-lg">
                {actionData.error}
              </div>
            )}
            
            <div className="mt-6 text-white text-sm">
              <h3 className="font-bold mb-1">使用提示：</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>使用详细的描述可以获得更好的结果</li>
                <li>可以尝试不同的模型来比较效果</li>
                <li>强化提示词功能可以优化您的输入</li>
              </ul>
            </div>
          </div>
          
          {/* 右侧结果展示 */}
          <div className="flex flex-col items-center justify-center">
            {isSubmitting ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-white text-lg">正在生成图片，请稍候...</p>
              </div>
            ) : actionData?.image ? (
              <div className="w-full">
                <h2 className="text-2xl font-bold text-white mb-3">生成的图片：</h2>
                <img 
                  src={`data:image/jpeg;base64,${actionData.image}`} 
                  alt="Generated Image" 
                  className="w-full rounded-xl shadow-lg border-2 border-white border-opacity-30" 
                />
                <div className="mt-3 text-white">
                  <p className="text-sm"><span className="font-semibold">原始提示词：</span> {actionData.prompt}</p>
                  <p className="text-sm"><span className="font-semibold">翻译后提示词：</span> {actionData.translatedPrompt}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-4 text-lg">输入提示词并点击生成图片按钮</p>
              </div>
            )}
          </div>
        </div>
        
        {/* 装饰元素 */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000 -z-10"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000 -z-10"></div>
      </div>
    </div>
  );
};

export default GenerateImage;