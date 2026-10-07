# Third-party notices

## FashionCLIP

The local clothing-category classifier includes quantized ONNX derivatives of
[`patrickjohncyh/fashion-clip`](https://huggingface.co/patrickjohncyh/fashion-clip),
distributed by [`Marqo/marqo-fashionCLIP`](https://huggingface.co/Marqo/marqo-fashionCLIP).
FashionCLIP and these model artifacts are provided under the MIT License.

Copyright (c) 2022 Patrick John Chia

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## ONNX Runtime

The bundled FashionCLIP runtime is Microsoft ONNX Runtime 1.22.0 (MIT).
The optional ImaJev download installs the official Microsoft.ML.OnnxRuntime
1.30.0 Windows x64 CPU runtime (MIT) from NuGet. The distribution's license and
third-party notices accompany the bundled DLLs in `image-classification/LICENSE`
and `image-classification/ThirdPartyNotices.txt`. Runtime source:
https://github.com/microsoft/onnxruntime.

## Optional ImaJev model

The opt-in model package is
https://huggingface.co/seutje/wordrop-imajev-4b-int4, revision
`6755f6fb978455ca4773a3fd399fe46a150b7c60`, derived from Qwen/Qwen3.5-4B
and mohit67890/imajev-4b (Apache-2.0). Package attribution, model cards, and license
files are downloaded alongside the model; model weights are not distributed in
the WorDrop installer.

## Qwen preprocessing compatibility

The local uint8 bicubic preprocessing implementation follows the fixed-point
antialiasing behavior described in PyTorch's
`aten/src/ATen/native/cpu/UpSampleKernel.cpp`, distributed under BSD-3-Clause:
https://github.com/pytorch/pytorch/blob/main/LICENSE.
Tokenizers is distributed under Apache-2.0:
https://github.com/huggingface/tokenizers/blob/main/LICENSE.
From PyTorch:

Copyright (c) 2016- Facebook, Inc (Adam Paszke)
Copyright (c) 2014- Facebook, Inc (Soumith Chintala)
Copyright (c) 2011-2014 Idiap Research Institute (Ronan Collobert)
Copyright (c) 2012-2014 Deepmind Technologies (Koray Kavukcuoglu)
Copyright (c) 2011-2012 NEC Laboratories America (Koray Kavukcuoglu)
Copyright (c) 2011-2013 NYU (Clement Farabet)
Copyright (c) 2006-2010 NEC Laboratories America (Ronan Collobert, Leon Bottou, Iain Melvin, Jason Weston)
Copyright (c) 2006 Idiap Research Institute (Samy Bengio)
Copyright (c) 2001-2004 Idiap Research Institute (Ronan Collobert, Samy Bengio, Johnny Mariethoz)

From Caffe2:

Copyright (c) 2016-present, Facebook Inc. All rights reserved.

All contributions by Facebook:
Copyright (c) 2016 Facebook Inc.

All contributions by Google:
Copyright (c) 2015 Google Inc.
All rights reserved.

All contributions by Yangqing Jia:
Copyright (c) 2015 Yangqing Jia
All rights reserved.

All contributions by Kakao Brain:
Copyright 2019-2020 Kakao Brain

All contributions by Cruise LLC:
Copyright (c) 2022 Cruise LLC.
All rights reserved.

All contributions by Tri Dao:
Copyright (c) 2024 Tri Dao.
All rights reserved.

All contributions by Arm:
Copyright (c) 2021, 2023-2025 Arm Limited and/or its affiliates

All contributions from Caffe:
Copyright(c) 2013, 2014, 2015, the respective contributors
All rights reserved.

All other contributions:
Copyright(c) 2015, 2016 the respective contributors
All rights reserved.

Caffe2 uses a copyright model similar to Caffe: each contributor holds
copyright over their contributions to Caffe2. The project versioning records
all such contribution and copyright details. If a contributor wants to further
mark their specific copyright on a particular contribution, they should
indicate their copyright solely in the commit message of the change when it is
committed.

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the distribution.

3. Neither the names of Facebook, Deepmind Technologies, NYU, NEC Laboratories America
   and IDIAP Research Institute nor the names of its contributors may be
   used to endorse or promote products derived from this software without
   specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.

## Microsoft Visual C++ runtime

The app includes app-local Microsoft Visual C++ 2022 x64 runtime DLLs from
Visual Studio's `VC/Redist/MSVC/14.44.35112/x64/Microsoft.VC143.CRT` directory,
distributed with the application as Distributable Code under the Visual Studio
license. The Microsoft distribution list is included in `windows-runtime/REDIST.txt`.
These support the native ONNX Runtime DLLs on Windows installations without
Visual C++ development tools or a separate runtime installer.
