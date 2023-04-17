import matplotlib.pyplot as plt
import numpy as np
import torch
from torch import nn
# from resnet import resnet50
from nets.mobilenet import mobilenetv2
from utils.utils import (cvtColor, get_classes, letterbox_image,
                         preprocess_input, show_config)


model = mobilenetv2(pretrained=False, num_classes=5)
model.load_state_dict(torch.load('models/single_channel.pth'))
model.eval()


def detect_image( image):
    # ---------------------------------------------------------#
    #   在这里将图像转换成RGB图像，防止灰度图在预测时报错。
    # ---------------------------------------------------------#
    image = cvtColor(image)
    # ---------------------------------------------------#
    #   对图片进行不失真的resize
    # ---------------------------------------------------#
    image_data = letterbox_image( image,[224, 224],True)
    # ---------------------------------------------------------#
    #   归一化+添加上batch_size维度+转置
    # ---------------------------------------------------------#
    image_data = np.transpose(np.expand_dims(preprocess_input(np.array(image_data, np.float32)), 0), (0, 3, 1, 2))

    with torch.no_grad():
        photo = torch.from_numpy(image_data)
        device = torch.device('cpu')
        photo = photo.to(device)
        # ---------------------------------------------------#
        #   图片传入网络进行预测
        # ---------------------------------------------------#
        preds = torch.softmax(model(photo)[0], dim=-1).cpu().numpy()
    # ---------------------------------------------------#
    #   获得所属种类
    # ---------------------------------------------------#
    class_names = ['热带低压', '热带风暴', '强热带风暴', '台风', '强台风']
    class_name = class_names[np.argmax(preds)]
    probability = np.max(preds)

    return class_name