import { type GrammarFinding } from "./grammar.ts";
export type GrammarCheck = {
    findings: GrammarFinding[];
    total: number;
} | null;
export declare function checkGrammar(text: string, languageCode: string, options?: {
    url?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
}): Promise<GrammarCheck>;
//# sourceMappingURL=languagetool.d.ts.map