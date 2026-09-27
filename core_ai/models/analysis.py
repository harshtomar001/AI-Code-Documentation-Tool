from pydantic import BaseModel, Field


class FunctionAnalysis(BaseModel):
    name: str
    line_start: int
    line_end: int
    parameters: list[str] = Field(default_factory=list)
    has_docstring: bool
    is_public: bool


class MethodAnalysis(BaseModel):
    name: str
    line_start: int
    line_end: int
    parameters: list[str] = Field(default_factory=list)
    has_docstring: bool
    is_public: bool


class ClassAnalysis(BaseModel):
    name: str
    line_start: int
    line_end: int
    has_docstring: bool
    is_public: bool
    methods: list[MethodAnalysis] = Field(default_factory=list)


class FileAnalysis(BaseModel):
    path: str
    language: str
    functions: list[FunctionAnalysis] = Field(default_factory=list)
    classes: list[ClassAnalysis] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    files: list[FileAnalysis] = Field(default_factory=list)