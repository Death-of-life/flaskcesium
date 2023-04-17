import numpy as np
import torch
import torch.nn as nn
from sklearn import preprocessing
class ChannelAttention(nn.Module):
    def __init__(self, in_planes, ratio):
        super(ChannelAttention, self).__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)

        self.fc1   = nn.Conv2d(in_planes, in_planes // ratio, 1, bias=False)
        self.relu1 = nn.ReLU()
        self.fc2   = nn.Conv2d(in_planes // ratio, in_planes, 1, bias=False)

        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        avg_out = self.fc2(self.relu1(self.fc1(self.avg_pool(x))))
        max_out = self.fc2(self.relu1(self.fc1(self.max_pool(x))))
        out = avg_out + max_out
        return self.sigmoid(out)
class SpatialAttention(nn.Module):
    def __init__(self, kernel_size=7):
        super(SpatialAttention, self).__init__()

        assert kernel_size in (3, 7), 'kernel size must be 3 or 7'
        padding = 3 if kernel_size == 7 else 1

        self.conv1 = nn.Conv2d(2, 1, kernel_size, padding=padding, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        avg_out = torch.mean(x, dim=1, keepdim=True)
        max_out, _ = torch.max(x, dim=1, keepdim=True)
        x = torch.cat([avg_out, max_out], dim=1)
        x = self.conv1(x)
        return self.sigmoid(x)
class tcmodel(nn.Module):
    def __init__(self):
        super(tcmodel, self).__init__()
        self.inplanes=512

        self.conv = nn.Sequential(
            nn.Conv3d(1, 16, kernel_size=(1, 4, 4), stride=(1, 2, 2), padding=(0, 1, 1), bias=False),
            nn.BatchNorm3d(16),
            nn.ReLU(),
            nn.Conv3d(16, 32, kernel_size=(1, 3, 3), stride=(1, 2, 2), padding=(0, 1, 1), bias=False),
            nn.BatchNorm3d(32),
            nn.ReLU(),
            nn.Conv3d(32, 64, kernel_size=(1, 3, 3), stride=(1, 2, 2), padding=(0, 1, 1), bias=False),
            nn.BatchNorm3d(64),
            nn.ReLU(),
            nn.Conv3d(64, 128, kernel_size=(2, 3, 3), stride=(1, 2, 2), padding=(0, 1, 1), bias=False),
            nn.BatchNorm3d(128),
            nn.ReLU(),
            nn.Conv3d(128, 256, kernel_size=(1, 3, 3), stride=(1, 2, 2), padding=(0, 1, 1), bias=False),
            nn.BatchNorm3d(256),
            nn.ReLU(),
            nn.Conv3d(256, 512, kernel_size=(1, 3, 3), stride=(1, 2, 2), padding=(0, 1, 1), bias=False),
            nn.BatchNorm3d(512),
            nn.ReLU(),
        )

        self.ca1 = ChannelAttention(512, 16)
        self.sa1 = SpatialAttention()

        self.fc = nn.Sequential(
            nn.Linear(2048, 1024),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(1024, 512),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, 1),
        )

    def forward(self, x):
        input_size = x.size(0)
        x = self.conv(x)  # 4*512*1*1
        x = x.squeeze(2)  # 明确指定移除深度维度

        x = self.ca1(x) * x
        x = self.sa1(x) * x

        x = x.view(input_size, -1)
        x = self.fc(x)
        return x

from PIL import Image


def catrgory(num):
    """
        根据标签分类
        7 H5 >= 137 knots
        6 H4 113-136 knots
        5 H3 96-112 knots
        4 H2 83-95 knots
        3 H1 64-82 knots
        2 TS 34-63 knots
        1 TD 20-33 knots
        0 NC <= 20knots
    """

    if num <= 20:
        return 'NC'
    elif 20 <= num <= 33:
        return 'TD'
    elif 34 <= num <= 63:
        return 'TS'
    elif 64 <= num <= 82:
        return 'H1'
    elif 83 <= num <= 95:
        return 'H2'
    elif 96 <= num <= 112:
        return 'H3'
    elif 113 <= num <= 136:
        return 'H4'
    elif 137 <= num:
        return 'H5'
def predict_double(img_ir,img_pmw):
    ir = torch.from_numpy(np.array(img_ir).astype(np.float64))
    pmw = torch.from_numpy(np.array(img_pmw).astype(np.float64))
    print('加载模型')
    model = tcmodel()
    model.double()
    model.load_state_dict(torch.load('models/double_channel.pth'))
    print('模型加载完毕')
    model.eval()
    inputs = []
    result_ir = preprocessing.MinMaxScaler().fit_transform(ir)  # 归一化ndarray 201*201
    result_ir = torch.from_numpy(result_ir).unsqueeze(0)  # tensor 1*201*201
    inputs.append(result_ir)
    result_PWM = np.nan_to_num(pmw)  # PWM
    result_PWM = preprocessing.MinMaxScaler().fit_transform(result_PWM)
    result_PWM = torch.from_numpy(result_PWM).unsqueeze(0)
    inputs.append(result_PWM)
    inputs = torch.stack(inputs, 0).squeeze()
    result = inputs.squeeze()  # 2*201*201
    bb = result[:, 40:161, 40:161]
    bb = bb.unsqueeze(0)
    bb = bb.unsqueeze(0)
    with torch.no_grad():
        wind_speed = model(bb)
    return wind_speed.item(),catrgory(wind_speed.item())

if __name__ == '__main__':
    ir = Image.open('IR55.png').convert('L')
    pmw = Image.open('PMW55.png').convert('L')
    ir = torch.from_numpy(np.array(ir).astype(np.float64))
    pmw = torch.from_numpy(np.array(ir).astype(np.float64))
    predict_double(ir,pmw)